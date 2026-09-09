const dotenv = require('dotenv');
const mongoose = require('mongoose');
const catalogService = require('../services/catalog/src');

dotenv.config();

const { Event, Ticket } = catalogService.models;
const inventoryService = catalogService.services.inventory;

const run = async () => {
  const mongoUri = process.env.CATALOG_MONGODB_URI || process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('CATALOG_MONGODB_URI or MONGODB_URI is required');

  await mongoose.connect(mongoUri);
  const cursor = Ticket.find({ inventoryMode: 'buckets' }).cursor();
  const eventTotals = new Map();
  let synced = 0;

  try {
    for await (const ticket of cursor) {
      const summary = await inventoryService.getInventorySummary(ticket._id);
      if (!summary) continue;
      await Ticket.updateOne({ _id: ticket._id }, {
        $set: {
          availableSeats: summary.availableSeats,
          soldSeats: summary.soldSeats,
          status: summary.availableSeats === 0 ? 'sold_out' : 'published'
        }
      });
      const eventId = ticket.event.toString();
      eventTotals.set(eventId, (eventTotals.get(eventId) || 0) + summary.soldSeats);
      synced += 1;
    }

    for (const [eventId, soldTickets] of eventTotals) {
      await Event.updateOne({ _id: eventId }, { $set: { 'stats.soldTickets': soldTickets } });
    }
  } finally {
    await mongoose.disconnect();
  }

  console.log(`Inventory bucket summaries synchronized. Tickets: ${synced}`);
};

run().catch(error => {
  console.error('Inventory bucket summary sync failed:', error);
  process.exitCode = 1;
});
