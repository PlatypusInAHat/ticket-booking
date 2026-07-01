const cache = new Map();

const getCache = (key) => {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.data;
};

const setCache = (key, data, ttlSeconds = 300) => {
  cache.set(key, {
    data,
    expiry: Date.now() + ttlSeconds * 1000
  });
};

const clearCache = (prefix = '') => {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};

const cacheMiddleware = (durationSeconds = 300) => {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `__express__${req.originalUrl || req.url}`;
    const cachedBody = getCache(key);

    if (cachedBody) {
      return res.status(200).json(cachedBody);
    }

    const originalJson = res.json;
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setCache(key, body, durationSeconds);
      }
      originalJson.call(res, body);
    };

    next();
  };
};

// Cleanup expired items every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of cache.entries()) {
    if (now > item.expiry) {
      cache.delete(key);
    }
  }
}, 300000).unref(); // unref so it doesn't prevent process exit

module.exports = {
  getCache,
  setCache,
  clearCache,
  cacheMiddleware
};
