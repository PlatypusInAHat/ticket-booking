require('dotenv').config();

const mongoose = require('mongoose');
const Payment = require('../services/booking/src/models/Payment');

const INDEXES = [
  {
    field: 'providerReference',
    name: 'provider_1_providerReference_1'
  },
  {
    field: 'providerOrderId',
    name: 'provider_1_providerOrderId_1'
  }
];

const findDuplicates = async (field) => Payment.aggregate([
  {
    $match: {
      [field]: { $type: 'string', $gt: '' }
    }
  },
  {
    $group: {
      _id: {
        provider: '$provider',
        value: `$${field}`
      },
      count: { $sum: 1 },
      paymentIds: { $push: '$_id' }
    }
  },
  { $match: { count: { $gt: 1 } } },
  { $limit: 20 }
]);

const migrateIndex = async ({ field, name }) => {
  const duplicates = await findDuplicates(field);
  if (duplicates.length > 0) {
    const summary = duplicates.map(item => ({
      provider: item._id.provider,
      value: item._id.value,
      count: item.count,
      paymentIds: item.paymentIds.map(String)
    }));
    throw new Error(`Duplicate ${field} values must be resolved first: ${JSON.stringify(summary)}`);
  }

  const indexes = await Payment.collection.indexes();
  const existing = indexes.find(index => index.name === name);
  if (existing && !existing.unique) {
    await Payment.collection.dropIndex(name);
  }

  await Payment.collection.createIndex(
    { provider: 1, [field]: 1 },
    {
      name,
      unique: true,
      partialFilterExpression: {
        [field]: { $type: 'string', $gt: '' }
      }
    }
  );

  console.log(`[payment-index] ${name} is unique`);
};

const run = async () => {
  const mongoUri = process.env.BOOKING_MONGODB_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('BOOKING_MONGODB_URI or MONGODB_URI is required');
  }

  await mongoose.connect(mongoUri, { autoIndex: false });
  for (const index of INDEXES) {
    await migrateIndex(index);
  }
};

run()
  .then(() => {
    console.log('[payment-index] migration completed');
  })
  .catch((error) => {
    console.error(`[payment-index] migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
