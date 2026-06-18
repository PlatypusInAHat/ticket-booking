const mongoose = require('mongoose');

const passSchema = new mongoose.Schema({
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  passCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  scanToken: {
    type: String,
    select: false
  },
  scanTokenHash: {
    type: String,
    select: false
  },
  barcodeValue: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
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
      uppercase: true,
      trim: true,
      default: ''
    }
  },
  nfcPayload: {
    type: String,
    select: false
  },
  nfcPayloadHash: {
    type: String,
    select: false
  },
  secretVersion: {
    type: String,
    default: 'hmac-sha256-v1'
  },
  status: {
    type: String,
    enum: ['issued', 'checked_in', 'cancelled', 'voided'],
    default: 'issued'
  },
  checkedInAt: {
    type: Date
  },
  checkedInBy: {
    type: mongoose.Schema.Types.ObjectId
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
  scanCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastScannedAt: Date,
  validFrom: Date,
  validUntil: Date,
  transfer: {
    isTransferable: {
      type: Boolean,
      default: false
    },
    transferredTo: {
      type: mongoose.Schema.Types.ObjectId
    },
    transferredAt: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  issuedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const bookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    unique: true,
    default: () => 'BK' + Date.now() + Math.random().toString(36).substr(2, 9)
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  tickets: [{
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    pricePerUnit: {
      type: Number,
      required: true
    },
    subtotal: {
      type: Number,
      required: true
    },
    snapshot: {
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
        country: String,
        coordinates: {
          lat: Number,
          lng: Number
        }
      },
      date: Date,
      time: {
        type: String,
        default: ''
      },
      currency: {
        type: String,
        default: 'VND',
        uppercase: true,
        trim: true
      }
    }
  }],
  passes: [passSchema],
  totalAmount: {
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
  pricing: {
    subtotal: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    tax: {
      type: Number,
      default: 0,
      min: 0
    },
    serviceFee: {
      type: Number,
      default: 0,
      min: 0
    },
    grandTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    promoCode: {
      type: String,
      default: '',
      uppercase: true,
      trim: true
    }
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'vnpay', 'momo', 'zalopay', 'cash', 'other'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  bookingStatus: {
    type: String,
    enum: ['confirmed', 'cancelled', 'pending'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    default: ''
  },
  payments: [{
    type: mongoose.Schema.Types.ObjectId
  }],
  source: {
    type: String,
    enum: ['web', 'mobile', 'admin', 'api'],
    default: 'web'
  },
  statusHistory: [{
    bookingStatus: String,
    paymentStatus: String,
    reason: {
      type: String,
      default: ''
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
  }],
  confirmedAt: Date,
  cancelledAt: Date,
  expiresAt: Date,
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
    requestedAt: Date,
    processedAt: Date,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  customerInfo: {
    name: String,
    email: String,
    phone: String,
    address: String
  },
  notes: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ bookingNumber: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ bookingStatus: 1, createdAt: -1 });
bookingSchema.index({ bookingStatus: 1, paymentStatus: 1, expiresAt: 1 });
bookingSchema.index({ source: 1, createdAt: -1 });
bookingSchema.index({ 'passes.passCode': 1 }, { unique: true, sparse: true });
bookingSchema.index({ 'passes.scanToken': 1 }, { unique: true, sparse: true });
bookingSchema.index({ 'passes.scanTokenHash': 1 }, { unique: true, sparse: true });
bookingSchema.index({ 'passes.nfcPayloadHash': 1 }, { unique: true, sparse: true });
bookingSchema.index({ 'passes.status': 1 });
bookingSchema.index({ 'passes.checkedInBy': 1, 'passes.checkedInAt': -1 });

module.exports = mongoose.model('Booking', bookingSchema);
