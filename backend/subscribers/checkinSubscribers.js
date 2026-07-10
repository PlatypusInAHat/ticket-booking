const checkinServicePackage = require('../services/checkin/src');
const { domainEvents } = require('@ticket-booking/platform');
const { subscribeEvents } = require('../shared/eventBus');
const { CheckInBookingProjection } = checkinServicePackage.models;
const EVENTS = domainEvents;

const toTicketSnapshotMap = (tickets = []) => {
  return new Map(tickets.map((item) => [
    item.ticket?.toString?.() || String(item.ticket),
    item.snapshot || {}
  ]));
};

const toProjectionPass = (pass = {}, ticketSnapshotMap = new Map()) => {
  const ticketId = pass.ticket?.toString?.() || String(pass.ticket || '');

  return {
    _id: pass._id,
    ticket: pass.ticket,
    passCode: pass.passCode || '',
    barcodeValue: pass.barcodeValue || '',
    scanTokenHash: pass.scanTokenHash || '',
    nfcPayloadHash: pass.nfcPayloadHash || '',
    status: pass.status || 'issued',
    holder: {
      name: pass.holder?.name || '',
      email: pass.holder?.email || '',
      phone: pass.holder?.phone || ''
    },
    seat: {
      section: pass.seat?.section || '',
      row: pass.seat?.row || '',
      number: pass.seat?.number || '',
      code: pass.seat?.code || ''
    },
    checkInMethod: pass.checkInMethod || '',
    checkInGate: pass.checkInGate || '',
    checkInDevice: pass.checkInDevice || '',
    checkedInAt: pass.checkedInAt,
    checkedInBy: pass.checkedInBy,
    lastScannedAt: pass.lastScannedAt,
    scanCount: pass.scanCount || 0,
    ticketSnapshot: ticketSnapshotMap.get(ticketId) || {}
  };
};

const toCheckInBookingProjection = (booking = {}) => {
  const ticketSnapshotMap = toTicketSnapshotMap(booking.tickets || []);

  return {
    _id: booking._id,
    bookingNumber: booking.bookingNumber || '',
    user: booking.user,
    bookingStatus: booking.bookingStatus || 'pending',
    paymentStatus: booking.paymentStatus || 'pending',
    customerInfo: {
      name: booking.customerInfo?.name || '',
      email: booking.customerInfo?.email || '',
      phone: booking.customerInfo?.phone || '',
      address: booking.customerInfo?.address || ''
    },
    passes: (booking.passes || []).map((pass) => toProjectionPass(pass, ticketSnapshotMap)),
    confirmedAt: booking.confirmedAt,
    cancelledAt: booking.cancelledAt,
    expiresAt: booking.expiresAt,
    sourceUpdatedAt: booking.updatedAt,
    projectedAt: new Date(),
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt || new Date()
  };
};

const upsertBookingProjection = async (booking = {}) => {
  if (!booking._id) {
    return;
  }

  const bookingProjection = toCheckInBookingProjection(booking);
  const { _id, ...projectionData } = bookingProjection;

  await CheckInBookingProjection.findByIdAndUpdate(
    _id,
    { $set: projectionData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const markBookingConfirmed = async (booking = {}) => {
  if (!booking._id) {
    return;
  }

  const bookingProjection = toCheckInBookingProjection(booking);

  await CheckInBookingProjection.findByIdAndUpdate(booking._id, {
    $set: {
      bookingNumber: bookingProjection.bookingNumber,
      user: bookingProjection.user,
      paymentStatus: bookingProjection.paymentStatus || 'completed',
      bookingStatus: bookingProjection.bookingStatus || 'confirmed',
      customerInfo: bookingProjection.customerInfo,
      passes: bookingProjection.passes,
      confirmedAt: bookingProjection.confirmedAt,
      expiresAt: bookingProjection.expiresAt,
      sourceUpdatedAt: bookingProjection.sourceUpdatedAt,
      projectedAt: new Date(),
      createdAt: bookingProjection.createdAt,
      updatedAt: bookingProjection.updatedAt || new Date()
    }
  }, { upsert: true, new: true, setDefaultsOnInsert: true });
};

const markBookingCancelled = async (bookingId, bookingPayload = {}) => {
  const bookingProjection = await CheckInBookingProjection.findById(bookingId);

  if (!bookingProjection) {
    await upsertBookingProjection(bookingPayload);
    return;
  }

  bookingProjection.bookingStatus = 'cancelled';
  bookingProjection.paymentStatus = bookingPayload.paymentStatus || bookingProjection.paymentStatus;
  bookingProjection.cancelledAt = bookingPayload.cancelledAt || new Date();
  bookingProjection.sourceUpdatedAt = bookingPayload.updatedAt || new Date();
  bookingProjection.projectedAt = new Date();
  bookingProjection.updatedAt = bookingPayload.updatedAt || new Date();
  bookingProjection.passes.forEach((pass) => {
    if (pass.status !== 'checked_in') {
      pass.status = 'cancelled';
    }
  });

  await bookingProjection.save();
};

const startCheckinSubscribers = async () => {
  await subscribeEvents({
    serviceName: 'checkin-service',
    routingKeys: [
      EVENTS.BOOKING_CREATED,
      EVENTS.PAYMENT_COMPLETED,
      EVENTS.BOOKING_CANCELLED,
      EVENTS.BOOKING_EXPIRED
    ],
    handler: async (event) => {
      const booking = event.payload.booking || {};

      if (event.type === EVENTS.BOOKING_CREATED) {
        await upsertBookingProjection(booking);
        return;
      }

      if (event.type === EVENTS.PAYMENT_COMPLETED) {
        await markBookingConfirmed(booking);
        return;
      }

      if ([EVENTS.BOOKING_CANCELLED, EVENTS.BOOKING_EXPIRED].includes(event.type)) {
        await markBookingCancelled(event.payload.bookingId || booking._id, booking);
      }
    }
  });
};

module.exports = startCheckinSubscribers;
module.exports.toTicketSnapshotMap = toTicketSnapshotMap;
module.exports.toProjectionPass = toProjectionPass;
module.exports.toCheckInBookingProjection = toCheckInBookingProjection;
