const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bookingServicePackage = require('../services/booking/src');
const { passUtils } = require('@ticket-booking/platform');

const { Booking } = bookingServicePackage.models;
const { buildPassSecrets, generatePassCode } = passUtils;

dotenv.config();

const createPassesForBooking = (booking) => {
  const passes = [];

  booking.tickets.forEach((item) => {
    for (let index = 0; index < item.quantity; index += 1) {
      const passCode = generatePassCode();
      const passSecrets = buildPassSecrets(passCode);

      passes.push({
        ticket: item.ticket,
        passCode,
        barcodeValue: passCode,
        nfcPayloadHash: passSecrets.nfcPayloadHash,
        scanTokenHash: passSecrets.scanTokenHash,
        secretVersion: passSecrets.secretVersion,
        status: booking.bookingStatus === 'cancelled' ? 'cancelled' : 'issued'
      });
    }
  });

  return passes;
};

const backfillPasses = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const bookings = await Booking.find({
      $or: [
        { passes: { $exists: false } },
        { passes: { $size: 0 } }
      ]
    });

    for (const booking of bookings) {
      booking.passes = createPassesForBooking(booking);
      booking.updatedAt = new Date();
      await booking.save();
      console.log(`Backfilled ${booking.passes.length} passes for ${booking.bookingNumber}`);
    }

    console.log(`Backfill completed. Updated bookings: ${bookings.length}`);
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

backfillPasses();
