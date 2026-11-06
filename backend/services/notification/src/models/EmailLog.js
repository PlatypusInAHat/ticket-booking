const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailJob'
  },
  to: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
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
  status: {
    type: String,
    enum: ['sent', 'failed', 'skipped', 'delivered', 'bounced', 'complained'],
    required: true
  },
  provider: {
    type: String,
    default: ''
  },
  providerMessageId: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
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

emailLogSchema.index({ to: 1, createdAt: -1 });
emailLogSchema.index({ status: 1, createdAt: -1 });
emailLogSchema.index({ category: 1, createdAt: -1 });
emailLogSchema.index({ providerMessageId: 1 }, { sparse: true });

module.exports = mongoose.model('EmailLog', emailLogSchema);
