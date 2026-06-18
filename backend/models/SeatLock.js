const crypto = require('crypto');
const mongoose = require('mongoose');

const seatLockSchema = new mongoose.Schema({
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  seatCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId
  },
  lockToken: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(18).toString('hex')
  },
  status: {
    type: String,
    enum: ['locked', 'released', 'converted', 'expired'],
    default: 'locked'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  releasedAt: Date,
  convertedAt: Date,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

seatLockSchema.index(
  { ticket: 1, seatCode: 1 },
  { unique: true, partialFilterExpression: { status: 'locked' } }
);
seatLockSchema.index({ user: 1, status: 1, expiresAt: 1 });
seatLockSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { status: 'locked' } }
);

module.exports = mongoose.model('SeatLock', seatLockSchema);
