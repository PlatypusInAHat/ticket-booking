const dotenv = require('dotenv');
const mongoose = require('mongoose');
const catalogService = require('../services/catalog/src');
const inventoryService = catalogService.services.inventory;

dotenv.config();

const { Ticket } = catalogService.models;

const run = async () => {
  const mongoUri = process.env.CATALOG_MONGODB_URI || process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('CATALOG_MONGODB_URI or MONGODB_URI is required');

  await mongoose.connect(mongoUri);
  const cursor = Ticket.find({
    isActive: true,
    'seatMap.mode': 'general_admission'
  }).cursor();
  let migrated = 0;

  try {
    for await (const ticket of cursor) {
      await inventoryService.ensureInventoryBuckets(ticket);
      ticket.inventoryMode = 'buckets';
      await ticket.save();
      migrated += 1;
    }
  } finally {
    await mongoose.disconnect();
  }

  console.log(`Inventory bucket migration completed. Tickets: ${migrated}`);
};

run().catch(error => {
  console.error('Inventory bucket migration failed:', error);
  process.exitCode = 1;
});
