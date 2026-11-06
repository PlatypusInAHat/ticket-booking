const { expirePendingBookings } = require('./bookingService');

const DEFAULT_INTERVAL_MS = 30 * 1000;

let workerTimer = null;
let workerRunning = false;

const getWorkerIntervalMs = () => {
  const value = Number.parseInt(process.env.BOOKING_EXPIRATION_INTERVAL_MS || '', 10);
  return Number.isFinite(value) && value >= 5000 ? value : DEFAULT_INTERVAL_MS;
};

const runBookingExpirationSweep = async () => {
  if (workerRunning) {
    return { skipped: true };
  }

  workerRunning = true;

  try {
    return await expirePendingBookings();
  } catch (error) {
    console.error('[booking-expiration] sweep failed:', error.message);
    return { error: error.message };
  } finally {
    workerRunning = false;
  }
};

const startBookingExpirationWorker = () => {
  if (workerTimer || process.env.BOOKING_EXPIRATION_WORKER_ENABLED === 'false') {
    return null;
  }

  const intervalMs = getWorkerIntervalMs();

  workerTimer = setInterval(() => {
    runBookingExpirationSweep();
  }, intervalMs);

  if (typeof workerTimer.unref === 'function') {
    workerTimer.unref();
  }

  setTimeout(() => {
    runBookingExpirationSweep();
  }, 3000).unref?.();

  console.log(`[booking-expiration] worker started, interval=${intervalMs}ms`);
  return workerTimer;
};

const stopBookingExpirationWorker = () => {
  if (!workerTimer) {
    return;
  }

  clearInterval(workerTimer);
  workerTimer = null;
};

module.exports = {
  runBookingExpirationSweep,
  startBookingExpirationWorker,
  stopBookingExpirationWorker
};
