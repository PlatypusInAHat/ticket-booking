const mongoose = require('mongoose');

const inventoryReservationSchema = new mongoose.Schema({
  reservationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'released', 'converted'],
    default: 'active',
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  releasedAt: Date,
  convertedAt: Date
}, {
  timestamps: true
});

inventoryReservationSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('InventoryReservation', inventoryReservationSchema);
