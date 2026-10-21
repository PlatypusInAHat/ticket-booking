const crypto = require('crypto');
const { getRedisClient } = require('../../../shared/redisClient');
const {
  campaignIdFor,
  normalizeEventIds,
  signAccessToken
} = require('../../../shared/waitingRoomToken');

const ENTRY_TTL_SECONDS = Number(process.env.WAITING_ROOM_ENTRY_TTL_SECONDS || 3600);
const ACCESS_TTL_SECONDS = Number(process.env.WAITING_ROOM_ACCESS_TTL_SECONDS || 600);
const CAPACITY = Number(process.env.WAITING_ROOM_ACTIVE_CAPACITY || 200);
const ADMISSION_RATE = Number(process.env.WAITING_ROOM_ADMISSION_RATE_PER_MINUTE || 120);

const entryKey = (id) => `waiting-room:entry:${id}`;
const queueKey = (campaign) => `waiting-room:queue:${campaign}`;
const activeKey = (campaign) => `waiting-room:active:${campaign}`;
const recentKey = (campaign) => `waiting-room:recent:${campaign}`;

const identityHash = (userId, fingerprint) => crypto
  .createHash('sha256')
  .update(`${userId}:${fingerprint}`)
  .digest('hex');

const join = async ({ eventIds, userId, fingerprint }) => {
  const normalizedEventIds = normalizeEventIds(eventIds);
  if (normalizedEventIds.length === 0 || normalizedEventIds.length > 10) {
    const error = new Error('eventIds must contain between 1 and 10 events');
    error.statusCode = 400;
    throw error;
  }

  const redis = await getRedisClient();
  const campaignId = campaignIdFor(normalizedEventIds);
  const identity = identityHash(userId, fingerprint);
  const identityKey = `waiting-room:identity:${campaignId}:${identity}`;
  const existingEntryId = await redis.get(identityKey);

  if (existingEntryId) {
    const existingState = await redis.hGet(entryKey(existingEntryId), 'state');
    if (existingState === 'waiting' || existingState === 'admitted') {
      return { entryToken: existingEntryId, campaignId };
    }
    await redis.del(identityKey);
  }

  const entryId = crypto.randomBytes(24).toString('base64url');
  const now = Date.now();
  const score = (now * 1000) + Math.floor(Math.random() * 1000);

  await redis.multi()
    .hSet(entryKey(entryId), {
      state: 'waiting',
      campaignId,
      eventIds: JSON.stringify(normalizedEventIds),
      userId: String(userId),
      fingerprintHash: identity,
      joinedAt: String(now)
    })
    .expire(entryKey(entryId), ENTRY_TTL_SECONDS)
    .zAdd(queueKey(campaignId), [{ score, value: entryId }], { NX: true })
    .expire(queueKey(campaignId), ENTRY_TTL_SECONDS)
    .set(identityKey, entryId, { EX: ENTRY_TTL_SECONDS, NX: true })
    .exec();

  const canonicalEntryId = await redis.get(identityKey);
  if (canonicalEntryId !== entryId) {
    await redis.zRem(queueKey(campaignId), entryId);
    await redis.del(entryKey(entryId));
  }

  return { entryToken: canonicalEntryId || entryId, campaignId };
};

const admissionScript = `
redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', ARGV[2])
redis.call('ZREMRANGEBYSCORE', KEYS[4], '-inf', tonumber(ARGV[2]) - 60000)
local state = redis.call('HGET', KEYS[3], 'state')
if not state then return {-1, -1, redis.call('ZCARD', KEYS[2])} end
if state == 'admitted' then
  local activeUntil = redis.call('ZSCORE', KEYS[2], ARGV[1])
  if activeUntil and tonumber(activeUntil) > tonumber(ARGV[2]) then
    return {1, 0, redis.call('ZCARD', KEYS[2])}
  end
  redis.call('HSET', KEYS[3], 'state', 'expired')
  return {-1, -1, redis.call('ZCARD', KEYS[2])}
end
local rank = redis.call('ZRANK', KEYS[1], ARGV[1])
if not rank then return {-1, -1, redis.call('ZCARD', KEYS[2])} end
local active = redis.call('ZCARD', KEYS[2])
local recent = redis.call('ZCARD', KEYS[4])
if active < tonumber(ARGV[3]) and recent < tonumber(ARGV[7]) and rank < tonumber(ARGV[4]) then
  redis.call('ZREM', KEYS[1], ARGV[1])
  redis.call('ZADD', KEYS[2], tonumber(ARGV[2]) + tonumber(ARGV[5]), ARGV[1])
  redis.call('EXPIRE', KEYS[2], tonumber(ARGV[6]))
  redis.call('ZADD', KEYS[4], ARGV[2], ARGV[1])
  redis.call('EXPIRE', KEYS[4], 120)
  redis.call('HSET', KEYS[3], 'state', 'admitted', 'admittedAt', ARGV[2])
  return {1, 0, active + 1}
end
return {0, rank + 1, active}
`;

const getStatus = async (entryId) => {
  const redis = await getRedisClient();
  const entry = await redis.hGetAll(entryKey(entryId));
  if (!entry?.campaignId) {
    const error = new Error('Waiting-room entry not found or expired');
    error.statusCode = 404;
    throw error;
  }

  const admissionWindow = Math.max(1, Math.ceil(ADMISSION_RATE / 60));
  const result = await redis.eval(admissionScript, {
    keys: [queueKey(entry.campaignId), activeKey(entry.campaignId), entryKey(entryId), recentKey(entry.campaignId)],
    arguments: [
      entryId,
      String(Date.now()),
      String(CAPACITY),
      String(admissionWindow),
      String(ACCESS_TTL_SECONDS * 1000),
      String(ENTRY_TTL_SECONDS),
      String(ADMISSION_RATE)
    ]
  });

  const [admitted, position, active] = result.map(Number);
  if (admitted < 0) {
    const error = new Error('Waiting-room entry not found or expired');
    error.statusCode = 404;
    throw error;
  }

  if (admitted === 1) {
    const accessToken = signAccessToken({
      entryId,
      eventIds: JSON.parse(entry.eventIds),
      userId: entry.userId,
      fingerprintHash: entry.fingerprintHash,
      expiresIn: ACCESS_TTL_SECONDS
    });
    return { state: 'admitted', position: 0, active, accessToken, expiresIn: ACCESS_TTL_SECONDS };
  }

  return {
    state: 'waiting',
    position,
    active,
    estimatedWaitSeconds: Math.max(5, Math.ceil(position / Math.max(1, ADMISSION_RATE)) * 60),
    retryAfterSeconds: 5
  };
};

module.exports = { getStatus, join };
