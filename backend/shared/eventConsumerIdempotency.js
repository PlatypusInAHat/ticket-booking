const mongoose = require('mongoose');
const ConsumedEvent = require('../models/ConsumedEvent');

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

const isIdempotencyEnabled = () => (
  parseBoolean(process.env.EVENT_IDEMPOTENCY_ENABLED, true) &&
  mongoose.connection.readyState === 1
);

const getProcessingTimeoutMs = () => (
  parsePositiveInt(process.env.EVENT_IDEMPOTENCY_PROCESSING_TIMEOUT_MS, 5 * 60 * 1000)
);

const claimEvent = async ({ consumerGroup, eventId, eventType, metadata = {} }) => {
  if (!isIdempotencyEnabled() || !eventId) {
    return { claimed: true, skipped: false };
  }

  const now = new Date();
  const staleBefore = new Date(Date.now() - getProcessingTimeoutMs());

  try {
    await ConsumedEvent.create({
      consumerGroup,
      eventId,
      eventType,
      status: 'processing',
      attempts: 1,
      lockedAt: now,
      metadata
    });

    return { claimed: true, skipped: false };
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }
  }

  const existing = await ConsumedEvent.findOne({ consumerGroup, eventId });
  if (!existing) {
    return { claimed: true, skipped: false };
  }

  if (existing.status === 'completed') {
    return { claimed: false, skipped: true, reason: 'already_completed' };
  }

  if (existing.status === 'processing' && existing.lockedAt && existing.lockedAt > staleBefore) {
    return { claimed: false, skipped: true, reason: 'already_processing' };
  }

  const reclaimed = await ConsumedEvent.findOneAndUpdate(
    {
      consumerGroup,
      eventId,
      $or: [
        { status: 'failed' },
        { status: 'processing', lockedAt: { $lte: staleBefore } }
      ]
    },
    {
      $set: {
        status: 'processing',
        lockedAt: now,
        lastError: '',
        metadata
      },
      $inc: {
        attempts: 1
      }
    },
    { new: true }
  );

  if (!reclaimed) {
    return { claimed: false, skipped: true, reason: 'race_lost' };
  }

  return { claimed: true, skipped: false, reclaimed: true };
};

const markEventCompleted = async ({ consumerGroup, eventId }) => {
  if (!isIdempotencyEnabled() || !eventId) {
    return;
  }

  await ConsumedEvent.updateOne(
    { consumerGroup, eventId },
    {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        lastError: ''
      }
    }
  );
};

const markEventFailed = async ({ consumerGroup, eventId, error }) => {
  if (!isIdempotencyEnabled() || !eventId) {
    return;
  }

  await ConsumedEvent.updateOne(
    { consumerGroup, eventId },
    {
      $set: {
        status: 'failed',
        lastError: String(error?.message || error || 'unknown error')
      }
    }
  );
};

module.exports = {
  claimEvent,
  isIdempotencyEnabled,
  markEventCompleted,
  markEventFailed
};
