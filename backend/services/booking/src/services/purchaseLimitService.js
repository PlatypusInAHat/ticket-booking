const { ApiError } = require('@ticket-booking/shared');
const PurchaseLimitCounter = require('../../../../models/PurchaseLimitCounter');

let initPromise = null;

const parseBoolean = (value, fallback = true) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getPurchaseLimitConfig = () => ({
  enabled: parseBoolean(process.env.PURCHASE_LIMIT_ENABLED, true),
  maxTicketsPerEvent: parsePositiveInt(process.env.PURCHASE_LIMIT_MAX_TICKETS_PER_EVENT, 10),
  windowMs: parsePositiveInt(process.env.PURCHASE_LIMIT_WINDOW_MS, 24 * 60 * 60 * 1000)
});

const ensurePurchaseLimitStore = async () => {
  const config = getPurchaseLimitConfig();

  if (!config.enabled) {
    return;
  }

  if (!initPromise) {
    initPromise = PurchaseLimitCounter.init().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  await initPromise;
};

const getWindow = (now, windowMs) => {
  const windowStart = Math.floor(now / windowMs) * windowMs;

  return {
    windowStart,
    resetAt: new Date(windowStart + windowMs),
    expiresAt: new Date(windowStart + windowMs + 60 * 1000)
  };
};

const groupQuantitiesByEvent = (bookingTickets = []) => {
  const quantities = new Map();

  bookingTickets.forEach((item) => {
    const eventId = item.event?.toString?.() || String(item.event || '');
    const quantity = Number(item.quantity || 0);

    if (!eventId || quantity < 1) {
      return;
    }

    quantities.set(eventId, (quantities.get(eventId) || 0) + quantity);
  });

  return quantities;
};

const incrementEventCounter = async ({
  eventId,
  userId,
  paymentMethod,
  deviceFingerprintHash,
  source,
  quantity,
  windowStart,
  resetAt,
  expiresAt,
  session
}) => {
  const normalizedDevice = deviceFingerprintHash || 'unknown-device';
  const key = [
    'purchase-limit',
    eventId,
    userId,
    paymentMethod,
    normalizedDevice,
    windowStart
  ].join(':');

  const insertUpdate = {
    $setOnInsert: {
      key,
      event: eventId,
      user: userId,
      paymentMethod,
      deviceFingerprintHash: normalizedDevice,
      source,
      resetAt,
      expiresAt
    },
    $inc: {
      count: quantity
    }
  };

  try {
    return await PurchaseLimitCounter.findOneAndUpdate(
      { key },
      insertUpdate,
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        session
      }
    );
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    return PurchaseLimitCounter.findOneAndUpdate(
      { key },
      { $inc: { count: quantity } },
      { new: true, session }
    );
  }
};

const enforcePurchaseLimits = async ({
  bookingTickets,
  userId,
  paymentMethod,
  source,
  deviceFingerprintHash,
  session
}) => {
  const config = getPurchaseLimitConfig();

  if (!config.enabled) {
    return [];
  }

  const quantitiesByEvent = groupQuantitiesByEvent(bookingTickets);
  if (quantitiesByEvent.size === 0) {
    return [];
  }

  const now = Date.now();
  const { windowStart, resetAt, expiresAt } = getWindow(now, config.windowMs);
  const counters = [];

  for (const [eventId, quantity] of quantitiesByEvent.entries()) {
    const counter = await incrementEventCounter({
      eventId,
      userId,
      paymentMethod,
      deviceFingerprintHash,
      source,
      quantity,
      windowStart,
      resetAt,
      expiresAt,
      session
    });

    if (counter.count > config.maxTicketsPerEvent) {
      throw new ApiError(
        429,
        `Purchase limit reached for this event. Maximum ${config.maxTicketsPerEvent} tickets are allowed in the current window.`
      );
    }

    counters.push(counter);
  }

  return counters;
};

module.exports = {
  ensurePurchaseLimitStore,
  enforcePurchaseLimits,
  getPurchaseLimitConfig,
  groupQuantitiesByEvent
};
