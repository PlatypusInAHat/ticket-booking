const mongoose = require('mongoose');

const consumedEventSchema = new mongoose.Schema({
  consumerGroup: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  eventId: {
    type: String,
    required: true,
    trim: true
  },
  eventType: {
    type: String,
    default: '',
    trim: true,
    index: true
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing',
    index: true
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0
  },
  lockedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  lastError: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

consumedEventSchema.index({ consumerGroup: 1, eventId: 1 }, { unique: true });
consumedEventSchema.index({ consumerGroup: 1, status: 1, updatedAt: 1 });

module.exports = mongoose.model('ConsumedEvent', consumedEventSchema);
