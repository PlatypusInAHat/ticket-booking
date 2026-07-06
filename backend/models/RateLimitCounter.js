const mongoose = require('mongoose');

const rateLimitCounterSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  limiterName: {
    type: String,
    required: true,
    index: true
  },
  identity: {
    type: String,
    required: true,
    index: true
  },
  count: {
    type: Number,
    default: 0,
    min: 0
  },
  resetAt: {
    type: Date,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 0
  }
}, {
  timestamps: true
});

rateLimitCounterSchema.index({ limiterName: 1, identity: 1, resetAt: 1 });

module.exports = mongoose.model('RateLimitCounter', rateLimitCounterSchema);
