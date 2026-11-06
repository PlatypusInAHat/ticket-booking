const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    trim: true
  },
  locale: {
    type: String,
    default: 'en'
  },
  version: {
    type: Number,
    default: 1,
    min: 1
  },
  type: {
    type: String,
    enum: ['transactional', 'reminder', 'marketing', 'system'],
    default: 'transactional'
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  html: {
    type: String,
    default: ''
  },
  text: {
    type: String,
    default: ''
  },
  active: {
    type: Boolean,
    default: true
  },
  variables: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

emailTemplateSchema.index({ key: 1, locale: 1, version: -1 });
emailTemplateSchema.index({ key: 1, locale: 1, active: 1 });

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
