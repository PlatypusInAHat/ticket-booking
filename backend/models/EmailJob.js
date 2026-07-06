const mongoose = require('mongoose');

const emailJobSchema = new mongoose.Schema({
  to: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId
  },
  type: {
    type: String,
    enum: ['transactional', 'reminder', 'marketing', 'system'],
    default: 'transactional'
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  template: {
    type: String,
    required: true,
    trim: true
  },
  context: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['queued', 'processing', 'sent', 'failed', 'skipped', 'cancelled'],
    default: 'queued'
  },
  priority: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  scheduledAt: {
    type: Date,
    default: Date.now
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0
  },
  maxAttempts: {
    type: Number,
    default: 3,
    min: 1
  },
  lastError: {
    type: String,
    default: ''
  },
  provider: {
    type: String,
    default: ''
  },
  providerMessageId: {
    type: String,
    default: ''
  },
  lockedAt: Date,
  lockUntil: Date,
  sentAt: Date,
  idempotencyKey: {
    type: String,
    trim: true,
    sparse: true,
    unique: true
  },
  sourceEvent: {
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

emailJobSchema.index({ status: 1, scheduledAt: 1, priority: -1, createdAt: 1 });
emailJobSchema.index({ lockUntil: 1 });
emailJobSchema.index({ to: 1, createdAt: -1 });
emailJobSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('EmailJob', emailJobSchema);
