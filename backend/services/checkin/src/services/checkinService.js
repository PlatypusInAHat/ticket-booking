const crypto = require('crypto');
const CheckInBookingProjection = require('../models/CheckInBookingProjection');
const CheckInDevice = require('../models/CheckInDevice');
const CheckInLog = require('../models/CheckInLog');
const OfflineSyncReceipt = require('../models/OfflineSyncReceipt');
const { ApiError } = require('@ticket-booking/shared');
const { passUtils, cryptoUtils, domainEvents, publishDomainEvent } = require('@ticket-booking/platform');
const EVENTS = domainEvents;
const { buildScanPayload, hashNfcPayload, hashScanToken, normalizeScanInput } = passUtils;
const { hmacSha256 } = cryptoUtils;

const CHECK_IN_MESSAGES = {
  notFound: 'Ticket not found.',
  unpaid: 'Booking is not paid or confirmed yet.',
  duplicate: 'Ticket has already been checked in.',
  cancelled: 'Ticket has been cancelled.',
  voided: 'Ticket has been voided.',
  valid: 'Ticket is valid.',
  success: 'Check-in successful.'
};

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const signOfflineManifest = (manifest, verificationKey) => {
  return crypto
    .createHmac('sha256', verificationKey)
    .update(JSON.stringify(manifest))
    .digest('hex');
};

const getOfflineManifestTtlMs = () => {
  const hours = Number.parseInt(process.env.CHECKIN_OFFLINE_MANIFEST_TTL_HOURS || '24', 10);
  return Math.max(1, Math.min(Number.isFinite(hours) ? hours : 24, 48)) * 60 * 60 * 1000;
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
  if (pass?.ticketSnapshot && Object.keys(pass.ticketSnapshot).length > 0) {
    return pass.ticketSnapshot;
  }

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
    event: pass.event,
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

const createOfflineManifest = async ({ eventId, deviceId, gate = '', appVersion = '' }, user) => {
  const device = await CheckInDevice.findOne({ deviceId });

  if (device && ['blocked', 'lost', 'inactive'].includes(device.status)) {
    throw new ApiError(403, 'This check-in device is not active');
  }

  await touchCheckInDevice({ deviceId, gate, user, appVersion });

  const bookings = await CheckInBookingProjection.find({
    bookingStatus: 'confirmed',
    paymentStatus: 'completed',
    'passes.event': eventId
  }).lean();

  const maxPasses = Math.max(1, Number.parseInt(process.env.CHECKIN_OFFLINE_MANIFEST_MAX_PASSES || '20000', 10));
  const entries = [];

  for (const booking of bookings) {
    for (const pass of booking.passes || []) {
      if (String(pass.event || '') !== String(eventId)) {
        continue;
      }

      if (entries.length >= maxPasses) {
        throw new ApiError(413, `Offline manifest exceeds the ${maxPasses} pass limit`);
      }

      const passCode = String(pass.passCode || '').toUpperCase();
      const scanToken = passUtils.buildPassSecrets(passCode).scanToken;
      const scanPayload = buildScanPayload(scanToken);
      const digests = [...new Set([
        sha256(passCode),
        sha256(String(pass.barcodeValue || passCode).toUpperCase()),
        sha256(scanToken),
        sha256(scanPayload)
      ])];

      entries.push({
        passId: String(pass._id),
        passCode,
        status: pass.status,
        digests,
        seatCode: pass.seat?.code || '',
        ticketName: pass.ticketSnapshot?.ticketName || '',
        eventName: pass.ticketSnapshot?.eventName || ''
      });
    }
  }

  if (entries.length === 0) {
    throw new ApiError(404, 'No paid passes were found for this event');
  }

  const issuedAt = new Date();
  const manifest = {
    version: 1,
    eventId: String(eventId),
    deviceId,
    gate,
    issuedAt: issuedAt.toISOString(),
    expiresAt: new Date(issuedAt.getTime() + getOfflineManifestTtlMs()).toISOString(),
    entries
  };
  const verificationKey = crypto.randomBytes(32).toString('hex');

  return {
    manifest,
    signature: signOfflineManifest(manifest, verificationKey),
    verificationKey
  };
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

  const booking = await CheckInBookingProjection.findOne({
    $or: [
      { 'passes.passCode': normalizedPassCode },
      { 'passes.barcodeValue': normalizedPassCode },
      { 'passes.scanTokenHash': scanTokenHash },
      { 'passes.nfcPayloadHash': nfcPayloadHash }
    ]
  })
    .select('+passes.scanTokenHash +passes.nfcPayloadHash');

  if (!booking) {
    return { booking: null, pass: null };
  }

  const pass = booking.passes.find((item) => {
    return (
      item.passCode === normalizedPassCode ||
      item.barcodeValue === normalizedPassCode ||
      item.scanTokenHash === scanTokenHash ||
      item.nfcPayloadHash === nfcPayloadHash
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
  expectedEventId = '',
  request = {}
}, user) => {
  const { booking, pass } = await findBookingAndPassByScanInput(scanInput);
  const eventMismatch = pass && expectedEventId && String(pass.event || '') !== String(expectedEventId);
  const validity = eventMismatch
    ? { valid: false, result: 'invalid', reason: 'Ticket belongs to a different event.' }
    : getPassValidity(booking, pass);
  const beforeStatus = pass?.status || '';
  const auditMetadata = request.offline ? {
    offline: true,
    localId: request.localId,
    scannedAt: request.scannedAt
  } : {};

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
      metadata: auditMetadata,
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
      metadata: auditMetadata,
      request
    });
    throw new ApiError(pass.status === 'checked_in' ? 409 : 400, validity.reason);
  }

  const checkedInAt = new Date();
  const updatedBooking = await CheckInBookingProjection.findOneAndUpdate(
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
    const latest = await CheckInBookingProjection.findById(booking._id);
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
      metadata: auditMetadata,
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
    metadata: auditMetadata,
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

const toOfflineSyncError = (error) => ({
  statusCode: error.statusCode || error.status || 500,
  reason: error.message || 'Offline check-in could not be synchronized'
});

const syncOneOfflineCheckIn = async (item, context, user) => {
  const receiptFilter = {
    deviceId: context.deviceId,
    localId: item.localId
  };

  try {
    await OfflineSyncReceipt.create({
      ...receiptFilter,
      event: context.eventId,
      staff: user.id,
      scannedAt: new Date(item.scannedAt),
      status: 'processing'
    });
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    const existing = await OfflineSyncReceipt.findOne(receiptFilter).lean();
    const configuredTimeoutMs = Number.parseInt(
      process.env.CHECKIN_OFFLINE_SYNC_PROCESSING_TIMEOUT_MS || '300000',
      10
    );
    const processingTimeoutMs = Math.max(
      30 * 1000,
      Number.isFinite(configuredTimeoutMs) ? configuredTimeoutMs : 300000
    );
    const staleBefore = new Date(Date.now() - processingTimeoutMs);

    if (existing?.status !== 'processing' || existing.updatedAt > staleBefore) {
      return {
        localId: item.localId,
        replayed: true,
        status: existing?.status || 'processing',
        ...(existing?.result || {})
      };
    }

    const successfulLog = await CheckInLog.findOne({
      deviceId: context.deviceId,
      'metadata.localId': item.localId,
      result: 'success'
    }).lean();

    if (successfulLog) {
      const recoveredResult = {
        valid: true,
        reason: CHECK_IN_MESSAGES.success,
        passId: String(successfulLog.passId || '')
      };
      await OfflineSyncReceipt.updateOne(receiptFilter, {
        $set: { status: 'accepted', result: recoveredResult, syncedAt: new Date() }
      });
      return { localId: item.localId, replayed: true, status: 'accepted', ...recoveredResult };
    }

    const reclaimed = await OfflineSyncReceipt.updateOne({
      ...receiptFilter,
      status: 'processing',
      updatedAt: { $lte: staleBefore }
    }, {
      $set: {
        staff: user.id,
        scannedAt: new Date(item.scannedAt),
        updatedAt: new Date()
      }
    });

    if (reclaimed.modifiedCount !== 1) {
      return { localId: item.localId, replayed: true, status: 'processing' };
    }
  }

  try {
    const result = await checkInPass({
      scanInput: item.code,
      method: item.method,
      gate: context.gate,
      deviceId: context.deviceId,
      appVersion: context.appVersion,
      expectedEventId: context.eventId,
      request: {
        ...context.request,
        offline: true,
        scannedAt: item.scannedAt,
        localId: item.localId
      }
    }, user);
    const receiptResult = { valid: true, pass: result.pass, reason: result.reason };

    await OfflineSyncReceipt.updateOne(receiptFilter, {
      $set: { status: 'accepted', result: receiptResult, syncedAt: new Date() }
    });

    return { localId: item.localId, status: 'accepted', ...receiptResult };
  } catch (error) {
    const failure = toOfflineSyncError(error);
    const status = failure.statusCode === 409 ? 'conflict' : 'rejected';

    await OfflineSyncReceipt.updateOne(receiptFilter, {
      $set: { status, result: failure, syncedAt: new Date() }
    });

    return { localId: item.localId, status, ...failure };
  }
};

const syncOfflineCheckIns = async ({
  eventId,
  deviceId,
  gate = '',
  appVersion = '',
  items = []
}, user, request = {}) => {
  await touchCheckInDevice({ deviceId, gate, user, appVersion });

  const results = [];
  for (const item of items) {
    results.push(await syncOneOfflineCheckIn(item, {
      eventId,
      deviceId,
      gate,
      appVersion,
      request
    }, user));
  }

  return {
    total: results.length,
    accepted: results.filter((item) => item.status === 'accepted').length,
    conflicts: results.filter((item) => item.status === 'conflict').length,
    rejected: results.filter((item) => item.status === 'rejected').length,
    results
  };
};

const getCheckInStats = async (ticketId) => {
  const match = ticketId ? { 'passes.ticket': ticketId } : {};
  const bookings = await CheckInBookingProjection.find(match);

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

const getCheckInEvents = async () => {
  const events = await CheckInBookingProjection.aggregate([
    {
      $match: {
        bookingStatus: 'confirmed',
        paymentStatus: 'completed'
      }
    },
    { $unwind: '$passes' },
    { $match: { 'passes.event': { $type: 'objectId' } } },
    {
      $group: {
        _id: '$passes.event',
        eventName: { $first: '$passes.ticketSnapshot.eventName' },
        date: { $first: '$passes.ticketSnapshot.date' },
        total: { $sum: 1 },
        issued: {
          $sum: { $cond: [{ $eq: ['$passes.status', 'issued'] }, 1, 0] }
        },
        checkedIn: {
          $sum: { $cond: [{ $eq: ['$passes.status', 'checked_in'] }, 1, 0] }
        }
      }
    },
    { $sort: { date: 1, eventName: 1 } },
    { $limit: 100 }
  ]);

  return events.map((event) => ({
    id: String(event._id),
    eventName: event.eventName || 'TicketStage event',
    date: event.date,
    total: event.total,
    issued: event.issued,
    checkedIn: event.checkedIn
  }));
};

module.exports = {
  checkInPass,
  createOfflineManifest,
  getCheckInEvents,
  getCheckInStats,
  syncOfflineCheckIns,
  validatePass
};
