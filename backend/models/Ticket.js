const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    index: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },
  eventName: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    lowercase: true,
    trim: true,
    unique: true,
    sparse: true
  },
  eventType: {
    type: String,
    enum: ['concert', 'train', 'flight', 'movie', 'sports', 'theater', 'conference', 'festival', 'workshop', 'other'],
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: 'https://via.placeholder.com/400'
  },
  location: {
    venue: String,
    address: String,
    city: String,
    state: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    default: '00:00'
  },
  price: {
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
  availableSeats: {
    type: Number,
    required: true,
    min: 0
  },
  totalSeats: {
    type: Number,
    required: true,
    min: 1
  },
  soldSeats: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    enum: ['standard', 'vip', 'premium', 'early_bird', 'student', 'child', 'group'],
    default: 'standard'
  },
  ticketName: {
    type: String,
    trim: true,
    default: ''
  },
  ticketType: {
    type: String,
    enum: ['general_admission', 'reserved_seat', 'vip', 'season_pass', 'addon'],
    default: 'general_admission'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'sold_out', 'cancelled', 'completed'],
    default: 'published'
  },
  saleWindow: {
    startsAt: Date,
    endsAt: Date
  },
  timezone: {
    type: String,
    default: 'Asia/Ho_Chi_Minh'
  },
  admission: {
    gatesOpenAt: Date,
    checkInStartsAt: Date,
    checkInEndsAt: Date,
    allowedMethods: {
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
        default: true
      },
      manual: {
        type: Boolean,
        default: true
      }
    }
  },
  seatMap: {
    mode: {
      type: String,
      enum: ['general_admission', 'reserved_seating'],
      default: 'general_admission'
    },
    sections: [{
      name: String,
      code: String,
      rows: [{
        label: String,
        seats: [{
          code: String,
          label: String,
          status: {
            type: String,
            enum: ['available', 'held', 'sold', 'blocked'],
            default: 'available'
          }
        }]
      }]
    }]
  },
  zoneMap: {
    backgroundImage: String,
    zones: [{
      id: String,
      name: String,
      tierId: String,
      color: String,
      coordinates: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      }
    }]
  },
  policies: {
    refundPolicy: {
      type: String,
      default: ''
    },
    transferAllowed: {
      type: Boolean,
      default: false
    },
    maxTicketsPerUser: {
      type: Number,
      default: 10,
      min: 1
    }
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'hidden'],
    default: 'public'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  artist: {
    type: String,
    default: ''
  },
  duration: {
    type: String,
    default: ''
  },
  ageRestriction: {
    type: Number,
    default: 0
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId
  },
  isActive: {
    type: Boolean,
    default: true
  },
  stats: {
    views: {
      type: Number,
      default: 0
    },
    favorites: {
      type: Number,
      default: 0
    }
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
}, { optimisticConcurrency: true });

// Index for faster queries
ticketSchema.index({ eventType: 1, date: 1, isActive: 1 });
ticketSchema.index({ company: 1, event: 1, category: 1 });
ticketSchema.index({ event: 1, price: 1 });
ticketSchema.index({ eventName: 'text', description: 'text' });
ticketSchema.index({ status: 1, date: 1 });
ticketSchema.index({ slug: 1 }, { unique: true, sparse: true });
ticketSchema.index({ tags: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);
