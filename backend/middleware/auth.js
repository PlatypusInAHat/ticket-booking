const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return next(new ApiError(401, 'Access token required'));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return next(new ApiError(403, 'Invalid or expired token'));
    }
    req.user = user;
    next();
  });
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Access denied. Insufficient permissions.'));
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRole };
