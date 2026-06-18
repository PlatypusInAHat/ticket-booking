const crypto = require('crypto');
const { hashSecret, hmacSha256 } = require('./cryptoUtils');

const generatePassCode = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `TB-${timestamp}-${randomPart}`;
};

const generateScanToken = (seed = '') => {
  if (seed) {
    return hmacSha256(seed, 'ticket-scan-token');
  }

  return crypto.randomBytes(32).toString('hex');
};

const buildScanPayload = (scanToken) => `TICKETBOOKING:${scanToken}`;

const hashScanToken = (scanToken) => hashSecret(scanToken, 'ticket-scan-token');

const hashNfcPayload = (nfcPayload) => hashSecret(nfcPayload, 'ticket-nfc-payload');

const buildPassSecrets = (passCode) => {
  const scanToken = generateScanToken(passCode);
  const nfcPayload = buildScanPayload(scanToken);

  return {
    nfcPayload,
    nfcPayloadHash: hashNfcPayload(nfcPayload),
    scanToken,
    scanTokenHash: hashScanToken(scanToken),
    secretVersion: 'hmac-sha256-v1'
  };
};

const normalizeScanInput = (value = '') => String(value).replace(/^TICKETBOOKING:/i, '').trim();

module.exports = {
  buildPassSecrets,
  buildScanPayload,
  generatePassCode,
  generateScanToken,
  hashNfcPayload,
  hashScanToken,
  normalizeScanInput
};
