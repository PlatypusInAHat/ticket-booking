const mongoose = require('mongoose');

const marketingCampaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  template: {
    type: String,
    default: 'marketingCampaign'
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'cancelled'],
    default: 'draft'
  },
  scheduledAt: Date,
  segment: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  context: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  stats: {
    queued: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId
  }
}, {
  timestamps: true
});

marketingCampaignSchema.index({ status: 1, scheduledAt: 1 });
marketingCampaignSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MarketingCampaign', marketingCampaignSchema);
