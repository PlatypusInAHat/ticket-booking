const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  provider: {
    type: String,
    enum: ['mock', 'vnpay', 'momo', 'zalopay', 'paypal', 'stripe', 'bank_transfer', 'cash', 'other'],
    default: 'mock'
  },
  method: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'vnpay', 'momo', 'zalopay', 'cash', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'VND',
    uppercase: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  providerReference: {
    type: String,
    trim: true,
    default: ''
  },
  providerOrderId: {
    type: String,
    trim: true,
    default: ''
  },
  checkoutUrl: {
    type: String,
    default: ''
  },
  clientSecret: {
    type: String,
    select: false
  },
  paymentToken: {
    type: String,
    select: false
  },
  paymentTokenHash: {
    type: String,
    select: false
  },
  failureReason: {
    type: String,
    default: ''
  },
  refund: {
    amount: {
      type: Number,
      default: 0,
      min: 0
    },
    reason: {
      type: String,
      default: ''
    },
    refundedAt: Date,
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  gatewayRequest: {
    type: mongoose.Schema.Types.Mixed,
    select: false
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed,
    select: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  expiresAt: Date,
  processedAt: Date
}, {
  timestamps: true
});

paymentSchema.index({ booking: 1, createdAt: -1 });
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ provider: 1, providerReference: 1 });
paymentSchema.index({ provider: 1, providerOrderId: 1 });
paymentSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
