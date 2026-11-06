const { ApiError } = require('@ticket-booking/shared');
const { cryptoUtils } = require('@ticket-booking/platform');

const { constantTimeEqual } = cryptoUtils;

const internalAuth = (req, res, next) => {
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) {
    return next(new ApiError(500, 'Internal API key is not configured'));
  }

  const providedKey = req.get('x-internal-api-key');

  if (!providedKey || !constantTimeEqual(providedKey, expectedKey)) {
    return next(new ApiError(401, 'Invalid internal API key'));
  }

  return next();
};

module.exports = internalAuth;
