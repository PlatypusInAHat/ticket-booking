const { ApiError } = require('@ticket-booking/shared');
const mongoose = require('mongoose');
const RateLimitCounter = require('../models/RateLimitCounter');
const crypto = require('crypto');
const { getRedisClient } = require('../shared/redisClient');

const stores = new Map();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getClientIp = (req) => {
  // Express only derives req.ip from forwarded headers when its trusted proxy setting allows it.
  return req.ip || req.connection?.remoteAddress || 'unknown';
};

const canUseMongoStore = () => {
  return process.env.RATE_LIMIT_STORE !== 'memory' && mongoose.connection.readyState === 1;
};

const canUseRedisStore = () => (
  process.env.RATE_LIMIT_STORE === 'redis' && Boolean(process.env.REDIS_URL)
);

const canUseMemoryFallback = () => (
  process.env.RATE_LIMIT_STORE === 'memory' ||
  process.env.NODE_ENV !== 'production' ||
  process.env.RATE_LIMIT_FAIL_OPEN === 'true'
);

const incrementMongoCounter = async ({
  limiterName,
  identity,
  windowMs,
  now
}) => {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetAt = new Date(windowStart + windowMs);
  const expiresAt = new Date(windowStart + windowMs + 60 * 1000);
  const key = `${limiterName}:${identity}:${windowStart}`;
  const update = {
    $setOnInsert: {
      key,
      limiterName,
      identity,
      resetAt,
      expiresAt
    },
    $inc: {
      count: 1
    }
  };

  try {
    return await RateLimitCounter.findOneAndUpdate(
      { key },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    return RateLimitCounter.findOneAndUpdate(
      { key },
      { $inc: { count: 1 } },
      { new: true }
    );
  }
};

const incrementRedisCounter = async ({ limiterName, identity, windowMs, now }) => {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetAt = windowStart + windowMs;
  const identityHash = crypto.createHash('sha256').update(identity).digest('hex');
  const key = `ticketstage:ratelimit:${limiterName}:${identityHash}:${windowStart}`;
  const client = await getRedisClient();
  const result = await client.multi()
    .incr(key)
    .pExpire(key, windowMs + 60 * 1000)
    .exec();

  return {
    count: Number(result[0]),
    resetAt
  };
};

const createRateLimiter = ({
  name,
  windowMs = 60 * 1000,
  max = 60,
  keyGenerator,
  message = 'Too many requests. Please try again later.'
}) => {
  const limiterName = name || `limiter-${stores.size + 1}`;
  const store = stores.get(limiterName) || new Map();
  stores.set(limiterName, store);

  return async (req, res, next) => {
    if (process.env.RATE_LIMIT_ENABLED === 'false') {
      next();
      return;
    }

    try {
      const now = Date.now();
      const identity = keyGenerator
        ? keyGenerator(req)
        : `${req.user?.id || 'anonymous'}:${getClientIp(req)}`;
      let count;
      let resetAt;

      if (canUseRedisStore()) {
        const counter = await incrementRedisCounter({
          limiterName,
          identity,
          windowMs,
          now
        });
        count = counter.count;
        resetAt = counter.resetAt;
      } else if (canUseMongoStore()) {
        const counter = await incrementMongoCounter({
          limiterName,
          identity,
          windowMs,
          now
        });
        count = counter.count;
        resetAt = counter.resetAt.getTime();
      } else if (canUseMemoryFallback()) {
        const key = `${limiterName}:${identity}`;
        const current = store.get(key);

        if (!current || current.resetAt <= now) {
          store.set(key, {
            count: 1,
            resetAt: now + windowMs
          });
          count = 1;
          resetAt = now + windowMs;
        } else {
          current.count += 1;
          count = current.count;
          resetAt = current.resetAt;
        }
      } else {
        next(new ApiError(503, 'Rate limit storage is unavailable. Please try again shortly.'));
        return;
      }

      const remaining = Math.max(0, max - count);
      const retryAfterSeconds = Math.ceil((resetAt - now) / 1000);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('Retry-After', retryAfterSeconds);

      if (count > max) {
        next(new ApiError(429, message));
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

const createEnvRateLimiter = ({
  name,
  windowEnv,
  maxEnv,
  defaultWindowMs,
  defaultMax,
  keyGenerator,
  message
}) => createRateLimiter({
  name,
  windowMs: parsePositiveInt(process.env[windowEnv], defaultWindowMs),
  max: parsePositiveInt(process.env[maxEnv], defaultMax),
  keyGenerator,
  message
});

const clearRateLimitStores = () => {
  stores.forEach((store) => store.clear());
};

module.exports = {
  clearRateLimitStores,
  createEnvRateLimiter,
  createRateLimiter,
  getClientIp
};
