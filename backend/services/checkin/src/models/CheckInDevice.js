const mongoose = require('mongoose');

const checkInDeviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    trim: true,
    default: ''
  },
  type: {
    type: String,
    enum: ['mobile_app', 'kiosk', 'scanner', 'gate_terminal', 'other'],
    default: 'mobile_app'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'lost', 'blocked'],
    default: 'active'
  },
  gate: {
    type: String,
    trim: true,
    default: ''
  },
  location: {
    venue: String,
    city: String,
    note: String
  },
  assignedStaff: [{
    type: mongoose.Schema.Types.ObjectId
  }],
  capabilities: {
    qr: {
      type: Boolean,
      default: true
    },
    barcode: {
      type: Boolean,
      default: true
    },
    nfc: {
      type: Boolean,
      default: false
    },
    manual: {
      type: Boolean,
      default: true
    }
  },
  appVersion: {
    type: String,
    default: ''
  },
  lastSeenAt: Date,
  lastUsedAt: Date,
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId
  },
  notes: {
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

checkInDeviceSchema.index({ status: 1, gate: 1 });
checkInDeviceSchema.index({ lastSeenAt: -1 });

module.exports = mongoose.model('CheckInDevice', checkInDeviceSchema);
