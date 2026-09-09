const mongoose = require('mongoose');

const eventSessionSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  startsAt: {
    type: Date,
    required: true
  },
  endsAt: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'completed'],
    default: 'active'
  }
}, {
  timestamps: true,
  collection: 'sessions'
});

eventSessionSchema.index({ event: 1, startsAt: 1 });

module.exports = mongoose.model('EventSession', eventSessionSchema);
