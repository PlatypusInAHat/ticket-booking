const mongoose = require('mongoose');
const {
  setEmailJobs,
  setEmailOldestQueuedAgeSeconds,
  setOutboxEvents,
  setOutboxOldestPendingAgeSeconds,
  setQueueDepth
} = require('./metrics');

const safeRequire = (path) => {
  try {
    // Optional collectors depend on models/services that only exist in some services.
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(path);
  } catch (error) {
    return null;
  }
};

const ageSeconds = (date) => {
  if (!date) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
};

const collectOutboxMetrics = async (serviceName) => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const EventOutbox = safeRequire('../models/EventOutbox');
  if (!EventOutbox) {
    return;
  }

  const statuses = ['pending', 'processing', 'published', 'failed'];
  await Promise.all(statuses.map(async (status) => {
    const count = await EventOutbox.countDocuments({ status });
    setOutboxEvents(serviceName, status, count);
  }));

  const oldestPending = await EventOutbox
    .findOne({ status: 'pending' })
    .sort({ createdAt: 1 })
    .select({ createdAt: 1 })
    .lean();

  setOutboxOldestPendingAgeSeconds(serviceName, ageSeconds(oldestPending?.createdAt));
};

const collectBookingQueueMetrics = async (serviceName) => {
  if (serviceName !== 'booking-service') {
    return;
  }

  const purchaseQueue = safeRequire('../services/booking/src/services/purchaseQueue');
  if (!purchaseQueue?.getPurchaseQueueStats) {
    return;
  }

  const stats = await purchaseQueue.getPurchaseQueueStats();
  const bookingStats = stats.booking || {};
  const queueName = bookingStats.name || 'booking-create';

  ['running', 'pending', 'completed', 'rejected'].forEach((state) => {
    setQueueDepth(serviceName, queueName, state, Number(bookingStats[state] || 0));
  });
};

const collectEmailQueueMetrics = async (serviceName) => {
  if (serviceName !== 'notification-service' || mongoose.connection.readyState !== 1) {
    return;
  }

  const EmailJob = safeRequire('../services/notification/src/models/EmailJob');
  if (!EmailJob) {
    return;
  }

  const statuses = ['queued', 'processing', 'sent', 'failed', 'skipped', 'cancelled'];
  await Promise.all(statuses.map(async (status) => {
    const count = await EmailJob.countDocuments({ status });
    setEmailJobs(serviceName, status, count);
  }));

  const oldestQueued = await EmailJob
    .findOne({ status: 'queued' })
    .sort({ scheduledAt: 1 })
    .select({ scheduledAt: 1 })
    .lean();

  setEmailOldestQueuedAgeSeconds(serviceName, ageSeconds(oldestQueued?.scheduledAt));
};

const collectRuntimeMetrics = async (serviceName) => {
  await Promise.all([
    collectOutboxMetrics(serviceName),
    collectBookingQueueMetrics(serviceName),
    collectEmailQueueMetrics(serviceName)
  ]);
};

module.exports = {
  collectRuntimeMetrics
};
