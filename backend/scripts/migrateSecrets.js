const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bookingServicePackage = require('../services/booking/src');
const { passUtils, cryptoUtils } = require('@ticket-booking/platform');

const { Booking, Payment } = bookingServicePackage.models;
const { buildPassSecrets } = passUtils;
const { hashSecret } = cryptoUtils;

dotenv.config();

const migratePassSecrets = async () => {
  const bookings = await Booking.find({
    passes: { $exists: true, $ne: [] }
  }).select('+passes.scanToken +passes.nfcPayload +passes.scanTokenHash +passes.nfcPayloadHash');

  let updatedBookings = 0;
  let updatedPasses = 0;

  for (const booking of bookings) {
    let changed = false;

    booking.passes.forEach((pass) => {
      if (!pass.passCode) {
        return;
      }

      const secrets = buildPassSecrets(pass.passCode);
      pass.scanTokenHash = secrets.scanTokenHash;
      pass.nfcPayloadHash = secrets.nfcPayloadHash;
      pass.secretVersion = secrets.secretVersion;
      pass.scanToken = undefined;
      pass.nfcPayload = undefined;

      changed = true;
      updatedPasses += 1;
    });

    if (changed) {
      booking.markModified('passes');
      booking.updatedAt = new Date();
      await booking.save({ validateBeforeSave: false });
      updatedBookings += 1;
    }
  }

  return { updatedBookings, updatedPasses };
};

const migratePaymentTokens = async () => {
  const payments = await Payment.find({
    paymentToken: { $exists: true, $nin: [null, ''] }
  }).select('+paymentToken +paymentTokenHash');

  let updatedPayments = 0;

  for (const payment of payments) {
    if (!payment.paymentToken) {
      continue;
    }

    payment.paymentTokenHash = hashSecret(payment.paymentToken, 'payment-token');
    payment.paymentToken = undefined;
    await payment.save({ validateBeforeSave: false });
    updatedPayments += 1;
  }

  return { updatedPayments };
};

const migrateSecrets = async () => {
  try {
    const mongoUri = process.env.BOOKING_MONGODB_URI || process.env.MONGODB_URI;
    await mongoose.connect(mongoUri);

    const passResult = await migratePassSecrets();
    const paymentResult = await migratePaymentTokens();

    console.log('Secret migration completed:', {
      ...passResult,
      ...paymentResult
    });
  } catch (error) {
    console.error('Secret migration failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  migrateSecrets();
}

module.exports = {
  migratePassSecrets,
  migratePaymentTokens,
  migrateSecrets
};
