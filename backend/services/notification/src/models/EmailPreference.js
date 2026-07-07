const mongoose = require('mongoose');

const emailPreferenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true
  },
  transactionalEnabled: {
    type: Boolean,
    default: true
  },
  eventReminderEnabled: {
    type: Boolean,
    default: true
  },
  marketingOptIn: {
    type: Boolean,
    default: false
  },
  locale: {
    type: String,
    default: 'en'
  },
  unsubscribedAt: Date,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

emailPreferenceSchema.index({ email: 1 }, { unique: true });
emailPreferenceSchema.index({ marketingOptIn: 1 });

module.exports = mongoose.model('EmailPreference', emailPreferenceSchema);
