const mongoose = require('mongoose');

const offlineSyncReceiptSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    trim: true
  },
  localId: {
    type: String,
    required: true,
    trim: true
  },
  event: mongoose.Schema.Types.ObjectId,
  staff: mongoose.Schema.Types.ObjectId,
  status: {
    type: String,
    enum: ['processing', 'accepted', 'conflict', 'rejected'],
    default: 'processing'
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  scannedAt: Date,
  syncedAt: Date
}, {
  timestamps: true
});

offlineSyncReceiptSchema.index({ deviceId: 1, localId: 1 }, { unique: true });
offlineSyncReceiptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('OfflineSyncReceipt', offlineSyncReceiptSchema);
