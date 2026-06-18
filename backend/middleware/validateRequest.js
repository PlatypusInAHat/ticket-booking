const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validateRequest = (req, res, next) => {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  const message = result
    .array()
    .map(error => error.msg)
    .join('; ');

  return next(new ApiError(400, message || 'Invalid request'));
};

module.exports = validateRequest;
