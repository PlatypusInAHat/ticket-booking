const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    index: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    index: true
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  ticketType: {
    type: String,
    trim: true,
    default: ''
  },
  category: {
    type: String,
    enum: ['standard', 'vip', 'premium', 'early_bird', 'student', 'child', 'group'],
    default: 'standard',
    index: true
  },
  eventType: {
    type: String,
    enum: ['concert', 'train', 'flight', 'movie', 'sports', 'theater', 'conference', 'festival', 'workshop', 'other'],
    index: true
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'hidden'],
    default: 'public',
    index: true
  },
  location: {
    venue: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '', index: true },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  date: {
    type: Date,
    index: true
  },
  time: {
    type: String,
    trim: true,
    default: ''
  },
  timezone: {
    type: String,
    default: 'Asia/Ho_Chi_Minh'
  },
  currency: {
    type: String,
    default: 'VND',
    uppercase: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  isFree: {
    type: Boolean,
    default: false
  },
  totalSeats: {
    type: Number,
    required: true,
    min: 1
  },
  availableSeats: {
    type: Number,
    required: true,
    min: 0
  },
  soldSeats: {
    type: Number,
    default: 0
  },
  saleWindow: {
    startsAt: Date,
    endsAt: Date
  },
  description: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  policies: {
    maxTicketsPerUser: {
      type: Number,
      default: 10,
      min: 1
    },
    minTicketsPerUser: {
      type: Number,
      default: 1,
      min: 1
    }
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'sold_out', 'cancelled', 'completed'],
    default: 'published'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

ticketSchema.index({ event: 1, session: 1 });
ticketSchema.index({ company: 1, event: 1 });
ticketSchema.index({ eventType: 1, status: 1, date: 1 });
ticketSchema.index({ 'location.city': 1, status: 1, date: 1 });
ticketSchema.index({ name: 'text', description: 'text', ticketType: 'text', tags: 'text' });

module.exports = mongoose.model('Ticket', ticketSchema);
