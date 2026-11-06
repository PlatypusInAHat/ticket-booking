const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    match: /^[A-Z0-9_-]{3,32}$/
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  maxDiscountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  eventIds: [{ type: mongoose.Schema.Types.ObjectId }],
  startsAt: Date,
  endsAt: Date,
  usageLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  perUserLimit: {
    type: Number,
    default: 1,
    min: 1
  },
  active: {
    type: Boolean,
    default: true
  },
  createdBy: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

promoCodeSchema.index({ active: 1, startsAt: 1, endsAt: 1 });

module.exports = mongoose.model('PromoCode', promoCodeSchema);
