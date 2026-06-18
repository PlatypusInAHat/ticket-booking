const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const {
  getPasswordHashRounds,
  pepperPassword
} = require('../utils/cryptoUtils');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    default: ''
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'staff', 'organizer'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  avatar: {
    type: String,
    default: 'https://via.placeholder.com/150'
  },
  profile: {
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say', ''],
      default: ''
    },
    identityNumber: {
      type: String,
      select: false
    },
    companyName: String,
    taxCode: String
  },
  preferences: {
    language: {
      type: String,
      default: 'vi'
    },
    currency: {
      type: String,
      default: 'VND',
      uppercase: true
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  },
  security: {
    passwordChangedAt: Date,
    passwordHashAlgorithm: {
      type: String,
      default: 'bcrypt'
    },
    passwordHashRounds: {
      type: Number,
      default: 12
    },
    passwordPeppered: {
      type: Boolean,
      default: false
    },
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    lockedUntil: Date
  },
  lastLoginAt: Date,
  bookings: [{
    type: mongoose.Schema.Types.ObjectId
  }],
  cart: [{
    type: mongoose.Schema.Types.ObjectId
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const rounds = getPasswordHashRounds();
    const salt = await bcrypt.genSalt(rounds);
    this.password = await bcrypt.hash(pepperPassword(this.password), salt);
    this.security = this.security || {};
    this.security.passwordChangedAt = new Date();
    this.security.passwordHashAlgorithm = 'bcrypt';
    this.security.passwordHashRounds = rounds;
    this.security.passwordPeppered = Boolean(process.env.PASSWORD_PEPPER);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  const currentRounds = getPasswordHashRounds();
  const storedRounds = bcrypt.getRounds(this.password);
  const pepperedPassword = pepperPassword(enteredPassword);
  const matchesPeppered = await bcrypt.compare(pepperedPassword, this.password);

  if (matchesPeppered) {
    this.$locals.passwordNeedsRehash = storedRounds < currentRounds;
    return true;
  }

  if (process.env.PASSWORD_PEPPER) {
    const matchesLegacy = await bcrypt.compare(enteredPassword, this.password);

    if (matchesLegacy) {
      this.$locals.passwordNeedsRehash = true;
      return true;
    }
  }

  return false;
};

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function() {
  const resetToken = require('crypto').randomBytes(20).toString('hex');
  
  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = require('crypto').createHash('sha256').update(resetToken).digest('hex');
  
  // Set expire (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  
  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
