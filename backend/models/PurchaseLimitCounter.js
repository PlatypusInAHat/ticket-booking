const mongoose = require('mongoose');

const purchaseLimitCounterSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  paymentMethod: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  deviceFingerprintHash: {
    type: String,
    default: '',
    trim: true,
    index: true
  },
  source: {
    type: String,
    default: 'web',
    trim: true,
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

purchaseLimitCounterSchema.index({
  event: 1,
  user: 1,
  paymentMethod: 1,
  deviceFingerprintHash: 1,
  resetAt: 1
});

module.exports = mongoose.model('PurchaseLimitCounter', purchaseLimitCounterSchema);
