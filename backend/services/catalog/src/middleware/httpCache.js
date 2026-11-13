const { cache } = require('@ticket-booking/platform');

const PUBLIC_CACHE_CONTROL = 'public, max-age=30, stale-while-revalidate=120';
const EVENTS_CACHE_PREFIX = '__express__/api/events';

/**
 * Marks anonymous public catalog GET responses as briefly cacheable by browsers/CDNs.
 * Requests that carry credentials are left untouched so user-specific data is never shared.
 */
const publicCacheControl = (req, res, next) => {
  if (req.method === 'GET' && !req.headers.authorization) {
    res.set('Cache-Control', PUBLIC_CACHE_CONTROL);
  }
  next();
};

/** Drops in-process cached event list/detail responses (they embed ticketSummary). */
const invalidateEventCache = () => {
  cache.clearCache(EVENTS_CACHE_PREFIX);
};

module.exports = {
  EVENTS_CACHE_PREFIX,
  PUBLIC_CACHE_CONTROL,
  invalidateEventCache,
  publicCacheControl
};
