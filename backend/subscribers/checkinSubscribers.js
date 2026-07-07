const Booking = require('../services/booking/src/models/Booking');
const EVENTS = require('../packages/platform/src/lib/domainEvents');
const { subscribeEvents } = require('../shared/eventBus');

const upsertBookingProjection = async (booking = {}) => {
  if (!booking._id) {
    return;
  }

  const { _id, ...bookingData } = booking;

  await Booking.findByIdAndUpdate(
    _id,
    { $set: bookingData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const markBookingConfirmed = async (booking = {}) => {
  if (!booking._id) {
    return;
  }

  await Booking.findByIdAndUpdate(booking._id, {
    $set: {
      paymentStatus: booking.paymentStatus || 'completed',
      bookingStatus: booking.bookingStatus || 'confirmed',
      transactionId: booking.transactionId || '',
      confirmedAt: booking.confirmedAt,
      expiresAt: booking.expiresAt,
      payments: booking.payments || [],
      statusHistory: booking.statusHistory || [],
      updatedAt: booking.updatedAt || new Date()
    }
  });
};

const markBookingCancelled = async (bookingId, bookingPayload = {}) => {
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    await upsertBookingProjection(bookingPayload);
    return;
  }

  booking.bookingStatus = 'cancelled';
  booking.paymentStatus = bookingPayload.paymentStatus || booking.paymentStatus;
  booking.cancelledAt = bookingPayload.cancelledAt || new Date();
  booking.updatedAt = bookingPayload.updatedAt || new Date();
  booking.passes.forEach((pass) => {
    if (pass.status !== 'checked_in') {
      pass.status = 'cancelled';
    }
  });

  await booking.save();
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
