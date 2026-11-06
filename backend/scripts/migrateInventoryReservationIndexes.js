require('dotenv').config();

const mongoose = require('mongoose');
const InventoryReservation = require('../services/catalog/src/models/InventoryReservation');

const run = async () => {
  const mongoUri = process.env.CATALOG_MONGODB_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('CATALOG_MONGODB_URI or MONGODB_URI is required');
  }

  await mongoose.connect(mongoUri, { autoIndex: false });
  await InventoryReservation.syncIndexes();
  console.log('[inventory-reservation-index] migration completed');
};

run()
  .catch((error) => {
    console.error(`[inventory-reservation-index] migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
