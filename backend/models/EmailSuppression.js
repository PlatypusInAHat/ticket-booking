const mongoose = require('mongoose');

const emailSuppressionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true
  },
  reason: {
    type: String,
    enum: ['bounce', 'complaint', 'unsubscribe', 'manual'],
    required: true
  },
  source: {
    type: String,
    default: 'system'
  },
  expiresAt: Date,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

emailSuppressionSchema.index({ email: 1 }, { unique: true });
emailSuppressionSchema.index({ reason: 1, createdAt: -1 });
emailSuppressionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

module.exports = mongoose.model('EmailSuppression', emailSuppressionSchema);
