const crypto = require('crypto');

const HASH_PREFIX = 'hmac-sha256';

const getSecretHashKey = () => {
  return (
    process.env.SECRET_HASH_KEY ||
    process.env.JWT_SECRET ||
    process.env.INTERNAL_API_KEY ||
    'development_secret_hash_key_change_me'
  );
};

const hmacSha256 = (value, purpose = 'generic') => {
  return crypto
    .createHmac('sha256', getSecretHashKey())
    .update(`${purpose}:${String(value)}`)
    .digest('hex');
};

const hashSecret = (value, purpose = 'generic') => {
  if (!value) {
    return '';
  }

  return `${HASH_PREFIX}:${hmacSha256(value, purpose)}`;
};

const isHashedSecret = (value = '') => {
  return String(value).startsWith(`${HASH_PREFIX}:`);
};

const hashForConstantTimeCompare = (value = '') => {
  return crypto
    .createHash('sha256')
    .update(String(value))
    .digest();
};

const constantTimeEqual = (left = '', right = '') => {
  const leftHash = hashForConstantTimeCompare(left);
  const rightHash = hashForConstantTimeCompare(right);
  return crypto.timingSafeEqual(leftHash, rightHash);
};

const verifySecret = (plainValue, storedValue, purpose = 'generic') => {
  if (!plainValue || !storedValue) {
    return false;
  }

  if (isHashedSecret(storedValue)) {
    return constantTimeEqual(hashSecret(plainValue, purpose), storedValue);
  }

  return constantTimeEqual(plainValue, storedValue);
};

const pepperPassword = (password = '') => {
  const pepper = process.env.PASSWORD_PEPPER;

  if (!pepper) {
    return String(password);
  }

  return crypto
    .createHmac('sha256', pepper)
    .update(String(password))
    .digest('hex');
};

const getPasswordHashRounds = () => {
  const rounds = Number.parseInt(process.env.PASSWORD_HASH_ROUNDS || '12', 10);
  return Number.isFinite(rounds) ? Math.min(Math.max(rounds, 10), 15) : 12;
};

const getMinimumPasswordLength = () => {
  const length = Number.parseInt(process.env.MIN_PASSWORD_LENGTH || '8', 10);
  return Number.isFinite(length) ? Math.max(length, 8) : 8;
};

module.exports = {
  constantTimeEqual,
  getMinimumPasswordLength,
  getPasswordHashRounds,
  hashSecret,
  hmacSha256,
  isHashedSecret,
  pepperPassword,
  verifySecret
};
