const mongoose = require('mongoose');

const eventOutboxSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    index: true
  },
  source: {
    type: String,
    required: true,
    default: 'unknown-service'
  },
  envelope: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'published', 'failed'],
    default: 'pending',
    index: true
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0
  },
  nextAttemptAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lockedAt: Date,
  publishedAt: Date,
  lastError: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

eventOutboxSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
eventOutboxSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('EventOutbox', eventOutboxSchema);
