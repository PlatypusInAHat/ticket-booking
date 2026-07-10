const mongoose = require('mongoose');

const checkInPassProjectionSchema = new mongoose.Schema({
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  passCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  barcodeValue: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  scanTokenHash: {
    type: String,
    default: '',
    select: false
  },
  nfcPayloadHash: {
    type: String,
    default: '',
    select: false
  },
  status: {
    type: String,
    enum: ['issued', 'checked_in', 'cancelled', 'voided'],
    default: 'issued'
  },
  holder: {
    name: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    }
  },
  seat: {
    section: {
      type: String,
      default: ''
    },
    row: {
      type: String,
      default: ''
    },
    number: {
      type: String,
      default: ''
    },
    code: {
      type: String,
      default: ''
    }
  },
  checkInMethod: {
    type: String,
    enum: ['qr', 'barcode', 'nfc', 'manual', ''],
    default: ''
  },
  checkInGate: {
    type: String,
    default: ''
  },
  checkInDevice: {
    type: String,
    default: ''
  },
  checkedInAt: Date,
  checkedInBy: mongoose.Schema.Types.ObjectId,
  lastScannedAt: Date,
  scanCount: {
    type: Number,
    default: 0,
    min: 0
  },
  ticketSnapshot: {
    ticketName: {
      type: String,
      default: ''
    },
    eventName: {
      type: String,
      default: ''
    },
    eventType: {
      type: String,
      default: ''
    },
    image: {
      type: String,
      default: ''
    },
    location: {
      venue: String,
      address: String,
      city: String,
      country: String
    },
    date: Date,
    time: {
      type: String,
      default: ''
    },
    currency: {
      type: String,
      default: 'VND'
    }
  }
}, { _id: true });

const checkInBookingProjectionSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  bookingNumber: {
    type: String,
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  bookingStatus: {
    type: String,
    enum: ['confirmed', 'cancelled', 'pending'],
    default: 'pending',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },
  customerInfo: {
    name: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    }
  },
  passes: [checkInPassProjectionSchema],
  confirmedAt: Date,
  cancelledAt: Date,
  expiresAt: Date,
  sourceUpdatedAt: Date,
  projectedAt: {
    type: Date,
    default: Date.now
  },
  createdAt: Date,
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'checkin_booking_projections'
});

checkInBookingProjectionSchema.index({ 'passes.passCode': 1 }, { unique: true, sparse: true });
checkInBookingProjectionSchema.index({ 'passes.barcodeValue': 1 }, { sparse: true });
checkInBookingProjectionSchema.index({ 'passes.scanTokenHash': 1 }, { unique: true, sparse: true });
checkInBookingProjectionSchema.index({ 'passes.nfcPayloadHash': 1 }, { unique: true, sparse: true });
checkInBookingProjectionSchema.index({ 'passes.status': 1 });
checkInBookingProjectionSchema.index({ 'passes.ticket': 1, 'passes.status': 1 });

module.exports = mongoose.model('CheckInBookingProjection', checkInBookingProjectionSchema);
