const Booking = require('../models/Booking');
const CheckInDevice = require('../models/CheckInDevice');
const CheckInLog = require('../models/CheckInLog');
const ApiError = require('../utils/ApiError');
const {
  buildScanPayload,
  hashNfcPayload,
  hashScanToken,
  normalizeScanInput
} = require('../utils/passUtils');
const { hmacSha256 } = require('../utils/cryptoUtils');
const { publishDomainEvent } = require('../shared/domainEventPublisher');
const EVENTS = require('../shared/domainEvents');

const CHECK_IN_MESSAGES = {
  notFound: 'Ticket not found.',
  unpaid: 'Booking is not paid or confirmed yet.',
  duplicate: 'Ticket has already been checked in.',
  cancelled: 'Ticket has been cancelled.',
  voided: 'Ticket has been voided.',
  valid: 'Ticket is valid.',
  success: 'Check-in successful.'
};

const hashScanInput = (scanInput = '') => {
  if (!scanInput) {
    return '';
  }

  return hmacSha256(scanInput, 'checkin-scan-log');
};

const getTicketId = (pass) => {
  if (!pass?.ticket) {
    return undefined;
  }

  return pass.ticket._id || pass.ticket;
};

const getTicketSnapshot = (booking, pass) => {
  const ticketId = getTicketId(pass)?.toString();

  if (!ticketId) {
    return {};
  }

  const ticketItem = booking.tickets?.find((item) => {
    return item.ticket?.toString() === ticketId;
  });

  return ticketItem?.snapshot || {};
};

const serializePassForCheckIn = (booking, pass, valid, reason = '') => ({
  valid,
  reason,
  booking: {
    id: booking._id,
    bookingNumber: booking.bookingNumber,
    bookingStatus: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    customerInfo: booking.customerInfo
  },
  pass: {
    id: pass._id,
    passCode: pass.passCode,
    barcodeValue: pass.barcodeValue,
    status: pass.status,
    checkedInAt: pass.checkedInAt,
    checkInMethod: pass.checkInMethod,
    checkInGate: pass.checkInGate,
    ticket: pass.ticket,
    ticketSnapshot: getTicketSnapshot(booking, pass)
  }
});

const writeCheckInLog = async ({
  action = 'check_in',
  booking = null,
  pass = null,
  user = null,
  scanInput = '',
  method = 'unknown',
  gate = '',
  deviceId = '',
  result,
  reason = '',
  beforeStatus = '',
  afterStatus = '',
  request = {},
  metadata = {}
}) => {
  try {
    await CheckInLog.create({
      action,
      booking: booking?._id,
      passId: pass?._id,
      ticket: getTicketId(pass),
      staff: user?.id,
      method: method || 'unknown',
      gate,
      deviceId,
      scanInputHash: hashScanInput(scanInput),
      result,
      reason,
      beforeStatus,
      afterStatus,
      request: {
        ip: request.ip || '',
        userAgent: request.userAgent || ''
      },
      metadata
    });
  } catch (error) {
    console.error('Failed to write check-in log:', error.message);
  }
};

const touchCheckInDevice = async ({ deviceId = '', gate = '', user = null, appVersion = '' }) => {
  if (!deviceId) {
    return;
  }

  try {
    const update = {
      $set: {
        gate,
        appVersion,
        lastSeenAt: new Date(),
        lastUsedAt: new Date()
      }
    };

    if (user?.id) {
      update.$addToSet = { assignedStaff: user.id };
    }

    await CheckInDevice.findOneAndUpdate(
      { deviceId },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    console.error('Failed to update check-in device:', error.message);
  }
};

const findBookingAndPassByScanInput = async (scanInput) => {
  const normalized = normalizeScanInput(scanInput);

  if (!normalized) {
    throw new ApiError(400, 'Scan code is required');
  }

  const normalizedPassCode = normalized.toUpperCase();
  const nfcPayload = buildScanPayload(normalized);
  const scanTokenHash = hashScanToken(normalized);
  const nfcPayloadHash = hashNfcPayload(nfcPayload);

  const booking = await Booking.findOne({
    $or: [
      { 'passes.passCode': normalizedPassCode },
      { 'passes.barcodeValue': normalizedPassCode },
      { 'passes.scanTokenHash': scanTokenHash },
      { 'passes.nfcPayloadHash': nfcPayloadHash },
      { 'passes.scanToken': normalized },
      { 'passes.nfcPayload': nfcPayload }
    ]
  })
    .select('+passes.scanToken +passes.nfcPayload +passes.scanTokenHash +passes.nfcPayloadHash');

  if (!booking) {
    return { booking: null, pass: null };
  }

  const pass = booking.passes.find((item) => {
    return (
      item.passCode === normalizedPassCode ||
      item.barcodeValue === normalizedPassCode ||
      item.scanTokenHash === scanTokenHash ||
      item.nfcPayloadHash === nfcPayloadHash ||
      item.scanToken === normalized ||
      item.nfcPayload === nfcPayload
    );
  });

  return { booking, pass };
};

const findPassById = (booking, passId) => {
  return booking?.passes?.find((item) => item._id.toString() === passId.toString());
};

const getPassValidity = (booking, pass) => {
  if (!booking || !pass) {
    return { valid: false, result: 'invalid', reason: CHECK_IN_MESSAGES.notFound };
  }

  if (booking.bookingStatus !== 'confirmed' || booking.paymentStatus !== 'completed') {
    return {
      valid: false,
      result: 'unpaid',
      reason: CHECK_IN_MESSAGES.unpaid
    };
  }

  if (pass.status === 'checked_in') {
    return { valid: false, result: 'duplicate', reason: CHECK_IN_MESSAGES.duplicate };
  }

  if (pass.status === 'cancelled') {
    return { valid: false, result: 'cancelled', reason: CHECK_IN_MESSAGES.cancelled };
  }

  if (pass.status === 'voided') {
    return { valid: false, result: 'voided', reason: CHECK_IN_MESSAGES.voided };
  }

  return { valid: true, result: 'valid', reason: CHECK_IN_MESSAGES.valid };
};

const validatePass = async (scanInput, user = null, request = {}) => {
  const { booking, pass } = await findBookingAndPassByScanInput(scanInput);
  const validity = getPassValidity(booking, pass);

  await writeCheckInLog({
    action: 'validate',
    booking,
    pass,
    user,
    scanInput,
    method: request.method || 'unknown',
    gate: request.gate || '',
    deviceId: request.deviceId || '',
    result: validity.result,
    reason: validity.reason,
    beforeStatus: pass?.status || '',
    afterStatus: pass?.status || '',
    request
  });

  if (!booking || !pass) {
    return {
      valid: false,
      reason: validity.reason
    };
  }

  return serializePassForCheckIn(booking, pass, validity.valid, validity.reason);
};

const checkInPass = async ({
  scanInput,
  method = 'qr',
  gate = '',
  deviceId = '',
  appVersion = '',
  request = {}
}, user) => {
  const { booking, pass } = await findBookingAndPassByScanInput(scanInput);
  const validity = getPassValidity(booking, pass);
  const beforeStatus = pass?.status || '';

  await touchCheckInDevice({ deviceId, gate, user, appVersion });

  if (!booking || !pass) {
    await writeCheckInLog({
      booking,
      pass,
      user,
      scanInput,
      method,
      gate,
      deviceId,
      result: validity.result,
      reason: validity.reason,
      request
    });
    throw new ApiError(404, validity.reason);
  }

  if (!validity.valid) {
    await writeCheckInLog({
      booking,
      pass,
      user,
      scanInput,
      method,
      gate,
      deviceId,
      result: validity.result,
      reason: validity.reason,
      beforeStatus,
      afterStatus: beforeStatus,
      request
    });
    throw new ApiError(pass.status === 'checked_in' ? 409 : 400, validity.reason);
  }

  const checkedInAt = new Date();
  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      bookingStatus: 'confirmed',
      paymentStatus: 'completed',
      passes: {
        $elemMatch: {
          _id: pass._id,
          status: 'issued'
        }
      }
    },
    {
      $set: {
        'passes.$.status': 'checked_in',
        'passes.$.checkedInAt': checkedInAt,
        'passes.$.checkedInBy': user.id,
        'passes.$.checkInMethod': method,
        'passes.$.checkInGate': gate,
        'passes.$.checkInDevice': deviceId,
        'passes.$.lastScannedAt': checkedInAt,
        updatedAt: checkedInAt
      },
      $inc: {
        'passes.$.scanCount': 1
      }
    },
    { new: true }
  );

  if (!updatedBooking) {
    const latest = await Booking.findById(booking._id);
    const latestPass = findPassById(latest, pass._id) || pass;
    const latestValidity = getPassValidity(latest, latestPass);

    await writeCheckInLog({
      booking: latest || booking,
      pass: latestPass,
      user,
      scanInput,
      method,
      gate,
      deviceId,
      result: latestValidity.result,
      reason: latestValidity.reason,
      beforeStatus,
      afterStatus: latestPass?.status || beforeStatus,
      request
    });

    throw new ApiError(latestPass?.status === 'checked_in' ? 409 : 400, latestValidity.reason);
  }

  const updatedPass = findPassById(updatedBooking, pass._id);

  await writeCheckInLog({
    booking: updatedBooking,
    pass: updatedPass,
    user,
    scanInput,
    method,
    gate,
    deviceId,
    result: 'success',
    reason: CHECK_IN_MESSAGES.success,
    beforeStatus,
    afterStatus: updatedPass.status,
    request
  });

  await publishDomainEvent(EVENTS.PASS_CHECKED_IN, {
    bookingId: updatedBooking._id.toString(),
    passId: updatedPass._id.toString(),
    ticketId: getTicketId(updatedPass)?.toString(),
    staffId: user.id,
    method,
    gate,
    deviceId,
    checkedInAt: updatedPass.checkedInAt
  }, {
    source: 'checkin-service'
  });

  return serializePassForCheckIn(updatedBooking, updatedPass, true, CHECK_IN_MESSAGES.success);
};

const getCheckInStats = async (ticketId) => {
  const match = ticketId ? { 'passes.ticket': ticketId } : {};
  const bookings = await Booking.find(match);

  const stats = bookings.reduce((accumulator, booking) => {
    booking.passes.forEach((pass) => {
      if (ticketId && pass.ticket.toString() !== ticketId) {
        return;
      }

      accumulator.total += 1;
      accumulator[pass.status] = (accumulator[pass.status] || 0) + 1;
    });

    return accumulator;
  }, {
    total: 0,
    issued: 0,
    checked_in: 0,
    cancelled: 0,
    voided: 0
  });

  const recentLogs = await CheckInLog.find(ticketId ? { ticket: ticketId } : {})
    .sort({ createdAt: -1 })
    .limit(20);

  return {
    ...stats,
    recentLogs
  };
};

module.exports = {
  checkInPass,
  getCheckInStats,
  validatePass
};
