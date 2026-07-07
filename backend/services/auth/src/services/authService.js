const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../../../../utils/ApiError');
const { getMinimumPasswordLength } = require('../../../../utils/cryptoUtils');

const getAccessTokenExpiry = () => process.env.JWT_ACCESS_EXPIRE || '15m';
const getRefreshTokenExpiry = () => process.env.JWT_REFRESH_EXPIRE || '24h';

const getRefreshSecret = () => (
  process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}_refresh`
);

const toIsoExpiry = (token) => {
  const decoded = jwt.decode(token);
  return decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null;
};

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: getAccessTokenExpiry() }
  );

  const refreshToken = jwt.sign(
    {
      id: user._id,
      version: user.security?.refreshTokenVersion || 0
    },
    getRefreshSecret(),
    { expiresIn: getRefreshTokenExpiry() }
  );

  return {
    accessToken,
    refreshToken,
    expiresAt: toIsoExpiry(accessToken),
    refreshExpiresAt: toIsoExpiry(refreshToken)
  };
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

  const { accessToken, refreshToken, expiresAt, refreshExpiresAt } = generateTokens(user);

  const { publishDomainEvent } = require('../../../../shared/domainEventPublisher');
  const EVENTS = require('../../../../shared/domainEvents');
  
  await publishDomainEvent(EVENTS.USER_REGISTERED, { user: { id: user._id, name: user.name, email: user.email } }, { source: 'auth-service' });

  return {
    token: accessToken,
    refreshToken,
    expiresAt,
    refreshExpiresAt,
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

  const { accessToken, refreshToken, expiresAt, refreshExpiresAt } = generateTokens(user);

  return {
    token: accessToken,
    refreshToken,
    expiresAt,
    refreshExpiresAt,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};

const refreshAuthToken = async (oldRefreshToken) => {
  if (!oldRefreshToken) {
    throw new ApiError(401, 'Refresh token is required');
  }

  try {
    const decoded = jwt.verify(oldRefreshToken, getRefreshSecret());
    
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, 'Invalid refresh token: User not found');
    }

    if (user.status && user.status !== 'active') {
      throw new ApiError(403, 'This account is not active');
    }

    if ((user.security?.refreshTokenVersion || 0) !== (decoded.version || 0)) {
      throw new ApiError(401, 'Refresh token has been revoked');
    }

    if (
      user.security?.passwordChangedAt &&
      decoded.iat &&
      user.security.passwordChangedAt.getTime() > decoded.iat * 1000
    ) {
      throw new ApiError(401, 'Refresh token has expired after password change');
    }

    const { accessToken, refreshToken, expiresAt, refreshExpiresAt } = generateTokens(user);

    return {
      token: accessToken,
      refreshToken,
      expiresAt,
      refreshExpiresAt,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, 'There is no user with that email');
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const { publishDomainEvent } = require('../../../../shared/domainEventPublisher');
  const EVENTS = require('../../../../shared/domainEvents');
  
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
  user.security = user.security || {};
  user.security.refreshTokenVersion = (user.security.refreshTokenVersion || 0) + 1;
  await user.save();

  return { message: 'Password updated successfully' };
};

const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, {
    $inc: {
      'security.refreshTokenVersion': 1
    }
  });

  return { message: 'Logged out successfully' };
};

module.exports = { register, login, refreshAuthToken, forgotPassword, resetPassword, logout };
