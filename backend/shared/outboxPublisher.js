const mongoose = require('mongoose');
const EventOutbox = require('../models/EventOutbox');
const {
  buildEnvelope,
  publishEnvelope
} = require('./eventBus');

let workerTimer = null;
let isDraining = false;

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isOutboxEnabled = () => process.env.OUTBOX_ENABLED !== 'false';

const canUseOutbox = () => {
  return isOutboxEnabled() && mongoose.connection.readyState === 1;
};

const getBackoffMs = (attempts) => {
  const baseMs = parsePositiveInt(process.env.OUTBOX_RETRY_BASE_MS, 1000);
  const maxMs = parsePositiveInt(process.env.OUTBOX_RETRY_MAX_MS, 60 * 1000);
  return Math.min(maxMs, baseMs * (2 ** Math.max(0, attempts - 1)));
};

const enqueueOutboxEvent = async (type, payload = {}, options = {}) => {
  if (!canUseOutbox()) {
    return false;
  }

  const envelope = buildEnvelope(type, payload, options.source);

  await EventOutbox.create({
    eventId: envelope.id,
    type,
    source: envelope.source,
    envelope,
    status: 'pending',
    nextAttemptAt: new Date()
  });

  return true;
};

const publishOutboxBatch = async (options = {}) => {
  if (!canUseOutbox() || isDraining) {
    return { processed: 0, published: 0, failed: 0 };
  }

  isDraining = true;

  try {
    const now = new Date();
    const limit = parsePositiveInt(options.limit || process.env.OUTBOX_BATCH_SIZE, 50);
    const maxAttempts = parsePositiveInt(process.env.OUTBOX_MAX_ATTEMPTS, 20);
    const lockTimeoutMs = parsePositiveInt(process.env.OUTBOX_LOCK_TIMEOUT_MS, 60 * 1000);
    const staleLockBefore = new Date(Date.now() - lockTimeoutMs);
    const events = await EventOutbox.find({
      attempts: { $lt: maxAttempts },
      $or: [
        {
          status: { $in: ['pending', 'failed'] },
          nextAttemptAt: { $lte: now }
        },
        {
          status: 'processing',
          lockedAt: { $lte: staleLockBefore }
        }
      ]
    })
      .sort({ createdAt: 1 })
      .limit(limit);

    let published = 0;
    let failed = 0;

    for (const event of events) {
      const claimed = await EventOutbox.findOneAndUpdate(
        {
          _id: event._id,
          $or: [
            { status: { $in: ['pending', 'failed'] } },
            { status: 'processing', lockedAt: { $lte: staleLockBefore } }
          ]
        },
        {
          $set: {
            status: 'processing',
            lockedAt: new Date()
          },
          $inc: {
            attempts: 1
          }
        },
        { new: true }
      );

      if (!claimed) {
        continue;
      }

      const wasPublished = await publishEnvelope(claimed.envelope);

      if (wasPublished) {
        await EventOutbox.updateOne(
          { _id: claimed._id },
          {
            $set: {
              status: 'published',
              publishedAt: new Date(),
              lastError: ''
            }
          }
        );
        published += 1;
      } else {
        const nextAttemptAt = new Date(Date.now() + getBackoffMs(claimed.attempts));

        await EventOutbox.updateOne(
          { _id: claimed._id },
          {
            $set: {
              status: 'failed',
              nextAttemptAt,
              lastError: 'Broker publish failed'
            }
          }
        );
        failed += 1;
      }
    }

    return {
      processed: events.length,
      published,
      failed
    };
  } finally {
    isDraining = false;
  }
};

const startOutboxPublisher = ({ serviceName = process.env.SERVICE_NAME || 'unknown-service' } = {}) => {
  if (!isOutboxEnabled() || workerTimer || process.env.NODE_ENV === 'test') {
    return null;
  }

  const intervalMs = parsePositiveInt(process.env.OUTBOX_PUBLISH_INTERVAL_MS, 5000);

  const tick = () => {
    publishOutboxBatch().catch((error) => {
      console.error(`[outbox] ${serviceName} publish failed:`, error.message);
    });
  };

  workerTimer = setInterval(tick, intervalMs);
  setTimeout(tick, 1000);
  console.log(`[outbox] ${serviceName} publisher started (${intervalMs}ms)`);

  return workerTimer;
};

const stopOutboxPublisher = () => {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
};

module.exports = {
  enqueueOutboxEvent,
  isOutboxEnabled,
  publishOutboxBatch,
  startOutboxPublisher,
  stopOutboxPublisher
};
