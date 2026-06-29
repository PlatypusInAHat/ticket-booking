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
  name: {
    type: String,
    required: true,
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

module.exports = mongoose.model('Ticket', ticketSchema);
