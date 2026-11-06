const crypto = require('crypto');

const getHashSecret = () => (
  process.env.DEVICE_FINGERPRINT_SECRET ||
  process.env.SECRET_HASH_KEY ||
  process.env.JWT_SECRET ||
  'ticketstage-local-device-fingerprint-secret'
);

const sha256 = (value) => crypto
  .createHash('sha256')
  .update(String(value || ''))
  .digest('hex');

const hmacSha256 = (value, secret = getHashSecret()) => crypto
  .createHmac('sha256', secret)
  .update(String(value || ''))
  .digest('hex');

const sanitizeToken = (value, maxLength = 2048) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().slice(0, maxLength);
};

const sanitizeFingerprint = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, '')
    .slice(0, 256);
};

module.exports = {
  hmacSha256,
  sanitizeFingerprint,
  sanitizeToken,
  sha256
};
