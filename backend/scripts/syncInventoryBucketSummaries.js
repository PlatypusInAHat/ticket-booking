const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Event = require('../services/catalog/src/models/Event');
const InventoryBucket = require('../services/catalog/src/models/InventoryBucket');
const Ticket = require('../services/catalog/src/models/Ticket');

dotenv.config();


const run = async () => {
  const mongoUri = process.env.CATALOG_MONGODB_URI || process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('CATALOG_MONGODB_URI or MONGODB_URI is required');

  await mongoose.connect(mongoUri);

  try {
    const summaries = await InventoryBucket.aggregate([
      { $group: {
        _id: '$ticket',
        totalSeats: { $sum: '$totalSeats' },
        availableSeats: { $sum: '$availableSeats' }
      } }
    ]);

    if (summaries.length === 0) {
      console.log('Inventory bucket summary sync completed. Tickets: 0');
      return;
    }

    const ticketIds = summaries.map(summary => summary._id);
    const tickets = await Ticket.find({ _id: { $in: ticketIds }, inventoryMode: 'buckets' })
      .select('_id event status')
      .lean();
    const ticketById = new Map(tickets.map(ticket => [ticket._id.toString(), ticket]));

    if (tickets.length === 0) return;

    await Ticket.bulkWrite(
      summaries
        .filter(summary => ticketById.has(summary._id.toString()))
        .map(summary => {
          const soldSeats = Math.max(0, summary.totalSeats - summary.availableSeats);

          return {
            updateOne: {
              filter: { _id: summary._id, inventoryMode: 'buckets' },
              update: [{
                $set: {
                  availableSeats: summary.availableSeats,
                  soldSeats,
                  status: { $cond: [
                    { $in: ['$status', ['published', 'sold_out']] },
                    summary.availableSeats === 0 ? 'sold_out' : 'published',
                    '$status'
                  ] }
                }
              }]
            }
          };
        }),
      { ordered: false }
    );

    const eventIds = [...new Set(tickets.map(ticket => ticket.event?.toString()).filter(Boolean))]
      .map(eventId => new mongoose.Types.ObjectId(eventId));
    const eventTotals = await Ticket.aggregate([
      { $match: { event: { $in: eventIds } } },
      { $group: { _id: '$event', soldTickets: { $sum: '$soldSeats' } } }
    ]);

    if (eventTotals.length > 0) await Event.bulkWrite(
      eventTotals.map(total => ({
        updateOne: {
          filter: { _id: total._id },
          update: { $set: { 'stats.soldTickets': total.soldTickets } }
        }
      })),
      { ordered: false }
    );

    console.log(`Inventory bucket summary sync completed. Tickets: ${summaries.length}`);
  } finally {
    await mongoose.disconnect();
  }
};

run().catch(error => {
  console.error('Inventory bucket summary sync failed:', error);
  process.exitCode = 1;
});
