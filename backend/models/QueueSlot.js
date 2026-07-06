const mongoose = require('mongoose');

const queueSlotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  slot: {
    type: Number,
    required: true,
    min: 0
  },
  token: {
    type: String,
    default: '',
    index: true
  },
  owner: {
    type: String,
    default: ''
  },
  acquiredAt: Date,
  releasedAt: Date,
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

queueSlotSchema.index({ name: 1, slot: 1 }, { unique: true });
queueSlotSchema.index({ name: 1, expiresAt: 1, slot: 1 });

module.exports = mongoose.model('QueueSlot', queueSlotSchema);
