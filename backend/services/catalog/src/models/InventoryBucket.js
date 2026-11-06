const mongoose = require('mongoose');

const inventoryBucketSchema = new mongoose.Schema({
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true,
    index: true
  },
  bucketIndex: {
    type: Number,
    required: true,
    min: 0
  },
  totalSeats: {
    type: Number,
    required: true,
    min: 0
  },
  availableSeats: {
    type: Number,
    required: true,
    min: 0
  }
}, { timestamps: true });

inventoryBucketSchema.index({ ticket: 1, bucketIndex: 1 }, { unique: true });
inventoryBucketSchema.index({ ticket: 1, availableSeats: 1 });

module.exports = mongoose.model('InventoryBucket', inventoryBucketSchema);
