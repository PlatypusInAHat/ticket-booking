const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const normalizeEventIds = (eventIds = []) => [...new Set(eventIds.map(String).filter(Boolean))].sort();

const campaignIdFor = (eventIds) => crypto
  .createHash('sha256')
  .update(normalizeEventIds(eventIds).join(','))
  .digest('hex')
  .slice(0, 24);

const getSecret = () => process.env.WAITING_ROOM_TOKEN_SECRET || process.env.JWT_SECRET;

const signAccessToken = ({ entryId, eventIds, userId, fingerprintHash, expiresIn }) => {
  const secret = getSecret();
  if (!secret) throw new Error('WAITING_ROOM_TOKEN_SECRET or JWT_SECRET is required');

  return jwt.sign({
    type: 'waiting-room-access',
    entryId,
    eventIds: normalizeEventIds(eventIds),
    userId: String(userId),
    fingerprintHash
  }, secret, {
    audience: 'ticketstage-booking',
    issuer: 'ticketstage-waiting-room',
    expiresIn,
    jwtid: crypto.randomUUID()
  });
};

const verifyAccessToken = (token) => {
  const secret = getSecret();
  if (!secret) throw new Error('WAITING_ROOM_TOKEN_SECRET or JWT_SECRET is required');
  return jwt.verify(token, secret, {
    audience: 'ticketstage-booking',
    issuer: 'ticketstage-waiting-room'
  });
};

module.exports = { campaignIdFor, normalizeEventIds, signAccessToken, verifyAccessToken };
