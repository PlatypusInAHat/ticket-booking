const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  legalName: {
    type: String,
    trim: true,
    default: ''
  },
  slug: {
    type: String,
    lowercase: true,
    trim: true,
    unique: true,
    sparse: true
  },
  taxCode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId
    },
    role: {
      type: String,
      enum: ['owner', 'manager', 'staff', 'finance'],
      default: 'staff'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  contact: {
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    website: {
      type: String,
      trim: true,
      default: ''
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  logo: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'archived'],
    default: 'active'
  },
  verification: {
    status: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'rejected'],
      default: 'unverified'
    },
    verifiedAt: Date,
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId
    },
    documents: [{
      name: String,
      url: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  settings: {
    defaultCurrency: {
      type: String,
      default: 'VND',
      uppercase: true
    },
    payoutBank: {
      bankName: String,
      accountNumber: {
        type: String,
        select: false
      },
      accountHolder: String
    }
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

companySchema.pre('validate', function(next) {
  if (!this.slug && this.name) {
    this.slug = `${slugify(this.name)}-${Date.now().toString(36)}`;
  }

  if (this.owner && !this.members.some(member => member.user?.toString() === this.owner.toString())) {
    this.members.push({
      user: this.owner,
      role: 'owner'
    });
  }

  next();
});

companySchema.index({ owner: 1, status: 1 });
companySchema.index({ name: 'text', description: 'text' });
companySchema.index({ 'members.user': 1 });

module.exports = mongoose.model('Company', companySchema);
