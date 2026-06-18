const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { getMinimumPasswordLength } = require('../utils/cryptoUtils');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

const register = async (userData) => {
  const { name, email, password, confirmPassword } = userData;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Please provide all required fields');
  }

  if (password.length < getMinimumPasswordLength()) {
    throw new ApiError(400, `Password must be at least ${getMinimumPasswordLength()} characters`);
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, 'Passwords do not match');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, 'Email already registered');
  }

  const user = new User({ name, email, password });
  await user.save();

  const token = generateToken(user);

  const { publishDomainEvent } = require('../shared/domainEventPublisher');
  const EVENTS = require('../shared/domainEvents');
  
  await publishDomainEvent(EVENTS.USER_REGISTERED, { user: { id: user._id, name: user.name, email: user.email } }, { source: 'auth-service' });

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};

const login = async (email, password) => {
  if (!email || !password) {
    throw new ApiError(400, 'Please provide email and password');
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.status && user.status !== 'active') {
    throw new ApiError(403, 'This account is not active');
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    user.security = user.security || {};
    user.security.failedLoginAttempts = (user.security.failedLoginAttempts || 0) + 1;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(401, 'Invalid email or password');
  }

  user.lastLoginAt = new Date();
  user.security = user.security || {};
  user.security.failedLoginAttempts = 0;

  if (user.$locals?.passwordNeedsRehash) {
    user.password = password;
  }

  await user.save({ validateBeforeSave: false });

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'There is no user with that email');
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const { publishDomainEvent } = require('../shared/domainEventPublisher');
  const EVENTS = require('../shared/domainEvents');
  
  await publishDomainEvent(EVENTS.PASSWORD_RESET_REQUESTED, { 
    user: { name: user.name, email: user.email },
    resetToken
  }, { source: 'auth-service' });

  return { message: 'Email sent' };
};

const resetPassword = async (resetToken, newPassword) => {
  const crypto = require('crypto');
  const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired token');
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  return { message: 'Password updated successfully' };
};

module.exports = { register, login, forgotPassword, resetPassword };
