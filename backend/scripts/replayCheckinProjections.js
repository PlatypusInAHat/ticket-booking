const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const bookingServicePackage = require('../services/booking/src');
const { domainEvents, publishDomainEvent } = require('@ticket-booking/platform');
const { closeEventBus } = require('../shared/eventBus');
const { publishOutboxBatch } = require('../shared/outboxPublisher');

const { Booking } = bookingServicePackage.models;
const { serializeBookingForEvent } = bookingServicePackage.services.booking;

const replayCheckInProjections = async () => {
  const mongoUri = process.env.BOOKING_MONGODB_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('BOOKING_MONGODB_URI or MONGODB_URI is required');
  }

  await mongoose.connect(mongoUri);
  const cursor = Booking.find({
    bookingStatus: 'confirmed',
    paymentStatus: 'completed'
  }).cursor();
  let queued = 0;

  for await (const booking of cursor) {
    await publishDomainEvent(domainEvents.PAYMENT_COMPLETED, {
      booking: serializeBookingForEvent(booking),
      bookingId: booking._id.toString(),
      userId: booking.user.toString(),
      replay: true
    }, { source: 'booking-service-projection-replay' });
    queued += 1;
  }

  let published = 0;
  while (published < queued) {
    const batch = await publishOutboxBatch({ limit: 100 });
    published += batch.published;

    if (batch.processed === 0 || batch.failed > 0) {
      break;
    }
  }

  if (published < queued) {
    throw new Error(`Queued ${queued} projection events but only published ${published}. Keep booking-service running so its outbox can retry.`);
  }

  console.log(`Replayed ${published} confirmed bookings for check-in projection rebuild.`);
};

replayCheckInProjections()
  .catch((error) => {
    console.error('Check-in projection replay failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeEventBus();
    await mongoose.disconnect();
  });
