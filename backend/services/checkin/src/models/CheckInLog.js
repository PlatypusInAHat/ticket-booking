const mongoose = require('mongoose');

const checkInLogSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ['validate', 'check_in'],
    default: 'check_in'
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId
  },
  passId: {
    type: mongoose.Schema.Types.ObjectId
  },
  ticket: {
    type: mongoose.Schema.Types.ObjectId
  },
  staff: {
    type: mongoose.Schema.Types.ObjectId
  },
  method: {
    type: String,
    enum: ['qr', 'barcode', 'nfc', 'manual', 'unknown'],
    default: 'unknown'
  },
  gate: {
    type: String,
    trim: true,
    default: ''
  },
  deviceId: {
    type: String,
    trim: true,
    default: ''
  },
  scanInputHash: {
    type: String,
    trim: true,
    default: ''
  },
  result: {
    type: String,
    enum: ['valid', 'success', 'duplicate', 'invalid', 'unpaid', 'cancelled', 'voided', 'error'],
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  beforeStatus: {
    type: String,
    default: ''
  },
  afterStatus: {
    type: String,
    default: ''
  },
  request: {
    ip: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    }
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

checkInLogSchema.index({ booking: 1, passId: 1, createdAt: -1 });
checkInLogSchema.index({ ticket: 1, createdAt: -1 });
checkInLogSchema.index({ staff: 1, createdAt: -1 });
checkInLogSchema.index({ deviceId: 1, createdAt: -1 });
checkInLogSchema.index({ result: 1, createdAt: -1 });
checkInLogSchema.index({ scanInputHash: 1, createdAt: -1 });

module.exports = mongoose.model('CheckInLog', checkInLogSchema);
