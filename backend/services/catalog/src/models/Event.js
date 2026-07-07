const mongoose = require('mongoose');
const slugify = require('../../../../utils/slugify');

const eventSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  organizerDetails: {
    name: { type: String, default: '' },
    info: { type: String, default: '' },
    logo: { type: String, default: '' }
  },
  title: {
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
  coverImage: {
    type: String,
    default: 'https://via.placeholder.com/1200x600'
  },
  gallery: [{
    url: String,
    caption: String
  }],
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
  startsAt: {
    type: Date,
    required: true
  },
  endsAt: Date,
  timezone: {
    type: String,
    default: 'Asia/Ho_Chi_Minh'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'sold_out', 'cancelled', 'completed', 'archived'],
    default: 'published'
  },
  saleWindow: {
    startsAt: Date,
    endsAt: Date
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
  policies: {
    refundPolicy: {
      type: String,
      default: ''
    },
    transferAllowed: {
      type: Boolean,
      default: false
    },
    ageRestriction: {
      type: Number,
      default: 0
    }
  },
  stats: {
    totalTickets: {
      type: Number,
      default: 0
    },
    soldTickets: {
      type: Number,
      default: 0
    },
    revenue: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

eventSchema.pre('validate', function(next) {
  if (!this.slug && this.title) {
    this.slug = `${slugify(this.title)}-${Date.now().toString(36)}`;
  }

  next();
});

eventSchema.index({ company: 1, startsAt: 1 });

eventSchema.index({ eventType: 1, status: 1, startsAt: 1 });
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Event', eventSchema);
