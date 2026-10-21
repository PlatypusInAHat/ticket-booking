require('dotenv').config();

const mongoose = require('mongoose');
const Booking = require('../services/booking/src/models/Booking');

const run = async () => {
  const mongoUri = process.env.BOOKING_MONGODB_URI || process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('BOOKING_MONGODB_URI or MONGODB_URI is required');

  await mongoose.connect(mongoUri, { autoIndex: false });
  await Booking.collection.createIndex(
    { 'security.waitingRoomEntryId': 1 },
    {
      name: 'security.waitingRoomEntryId_1',
      unique: true,
      partialFilterExpression: { 'security.waitingRoomEntryId': { $type: 'string', $gt: '' } }
    }
  );
};

run()
  .then(() => console.log('[waiting-room-index] migration completed'))
  .catch((error) => {
    console.error(`[waiting-room-index] migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
