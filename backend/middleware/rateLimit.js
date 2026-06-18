const ApiError = require('../utils/ApiError');

const stores = new Map();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.connection?.remoteAddress || 'unknown';
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

  return (req, res, next) => {
    if (process.env.RATE_LIMIT_ENABLED === 'false') {
      next();
      return;
    }

    const now = Date.now();
    const identity = keyGenerator
      ? keyGenerator(req)
      : `${req.user?.id || 'anonymous'}:${getClientIp(req)}`;
    const key = `${limiterName}:${identity}`;
    const current = store.get(key);

    if (!current || current.resetAt <= now) {
      store.set(key, {
        count: 1,
        resetAt: now + windowMs
      });

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - 1));
      next();
      return;
    }

    current.count += 1;
    const remaining = Math.max(0, max - current.count);
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('Retry-After', retryAfterSeconds);

    if (current.count > max) {
      next(new ApiError(429, message));
      return;
    }

    next();
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
