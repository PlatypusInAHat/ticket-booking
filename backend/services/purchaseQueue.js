const crypto = require('crypto');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const QueueSlot = require('../models/QueueSlot');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const canUseMongoSlots = () => {
  return process.env.BOOKING_QUEUE_STORE !== 'memory' && mongoose.connection.readyState === 1;
};

class InMemoryTaskQueue {
  constructor({
    name,
    concurrency = 5,
    maxSize = 500,
    waitTimeoutMs = 30 * 1000
  }) {
    this.name = name;
    this.concurrency = concurrency;
    this.maxSize = maxSize;
    this.waitTimeoutMs = waitTimeoutMs;
    this.pending = [];
    this.running = 0;
    this.completed = 0;
    this.rejected = 0;
  }

  get size() {
    return this.pending.length + this.running;
  }

  add(task) {
    if (process.env.BOOKING_QUEUE_ENABLED === 'false') {
      return task();
    }

    if (this.size >= this.maxSize) {
      this.rejected += 1;
      throw new ApiError(429, 'The ticketing system is busy. Please try again in a few minutes.');
    }

    return new Promise((resolve, reject) => {
      const job = {
        task,
        resolve,
        reject,
        cancelled: false,
        timer: null
      };

      job.timer = setTimeout(() => {
        job.cancelled = true;
        this.rejected += 1;
        reject(new ApiError(503, 'The ticket purchase queue is overloaded. Please try again later.'));
      }, this.waitTimeoutMs);

      this.pending.push(job);
      this.drain();
    });
  }

  drain() {
    while (this.running < this.concurrency && this.pending.length > 0) {
      const job = this.pending.shift();

      if (!job || job.cancelled) {
        continue;
      }

      clearTimeout(job.timer);
      this.running += 1;

      Promise.resolve()
        .then(job.task)
        .then((result) => {
          this.completed += 1;
          job.resolve(result);
        })
        .catch(job.reject)
        .finally(() => {
          this.running -= 1;
          this.drain();
        });
    }
  }

  stats() {
    return {
      name: this.name,
      running: this.running,
      pending: this.pending.length,
      concurrency: this.concurrency,
      maxSize: this.maxSize,
      completed: this.completed,
      rejected: this.rejected
    };
  }
}

class MongoSlotQueue {
  constructor({
    name,
    concurrency = 5,
    waitTimeoutMs = 30 * 1000,
    pollIntervalMs = 200,
    leaseMs = 5 * 60 * 1000
  }) {
    this.name = name;
    this.concurrency = concurrency;
    this.waitTimeoutMs = waitTimeoutMs;
    this.pollIntervalMs = pollIntervalMs;
    this.leaseMs = leaseMs;
    this.completed = 0;
    this.rejected = 0;
    this.initialized = false;
  }

  async ensureSlots() {
    if (this.initialized) {
      return;
    }

    const expiredAt = new Date(0);
    const operations = Array.from({ length: this.concurrency }, (_, slot) => ({
      updateOne: {
        filter: { name: this.name, slot },
        update: {
          $setOnInsert: {
            name: this.name,
            slot,
            token: '',
            owner: '',
            expiresAt: expiredAt
          }
        },
        upsert: true
      }
    }));

    await QueueSlot.bulkWrite(operations, { ordered: false });
    this.initialized = true;
  }

  async acquireSlot() {
    await this.ensureSlots();

    const token = crypto.randomUUID();
    const deadline = Date.now() + this.waitTimeoutMs;
    const owner = `${process.env.SERVICE_NAME || 'booking-service'}:${process.pid}`;

    while (Date.now() <= deadline) {
      const now = new Date();
      const slot = await QueueSlot.findOneAndUpdate(
        {
          name: this.name,
          slot: { $gte: 0, $lt: this.concurrency },
          expiresAt: { $lte: now }
        },
        {
          $set: {
            token,
            owner,
            acquiredAt: now,
            releasedAt: null,
            expiresAt: new Date(now.getTime() + this.leaseMs)
          }
        },
        {
          new: true,
          sort: { slot: 1 }
        }
      );

      if (slot) {
        return { slot, token };
      }

      await wait(this.pollIntervalMs);
    }

    this.rejected += 1;
    throw new ApiError(503, 'The ticket purchase queue is overloaded. Please try again later.');
  }

  async releaseSlot(slot, token) {
    if (!slot || !token) {
      return;
    }

    await QueueSlot.updateOne(
      {
        _id: slot._id,
        token
      },
      {
        $set: {
          token: '',
          owner: '',
          releasedAt: new Date(),
          expiresAt: new Date(0)
        }
      }
    );
  }

  async add(task) {
    if (process.env.BOOKING_QUEUE_ENABLED === 'false') {
      return task();
    }

    const lease = await this.acquireSlot();

    try {
      const result = await task();
      this.completed += 1;
      return result;
    } finally {
      await this.releaseSlot(lease.slot, lease.token);
    }
  }

  async stats() {
    await this.ensureSlots();
    const now = new Date();
    const running = await QueueSlot.countDocuments({
      name: this.name,
      slot: { $gte: 0, $lt: this.concurrency },
      expiresAt: { $gt: now }
    });

    return {
      name: this.name,
      store: 'mongo',
      running,
      pending: 0,
      concurrency: this.concurrency,
      maxSize: this.concurrency,
      completed: this.completed,
      rejected: this.rejected
    };
  }
}

const memoryBookingQueue = new InMemoryTaskQueue({
  name: 'booking-create',
  concurrency: parsePositiveInt(process.env.BOOKING_QUEUE_CONCURRENCY, 5),
  maxSize: parsePositiveInt(process.env.BOOKING_QUEUE_MAX_SIZE, 500),
  waitTimeoutMs: parsePositiveInt(process.env.BOOKING_QUEUE_WAIT_TIMEOUT_MS, 30 * 1000)
});

const mongoBookingQueue = new MongoSlotQueue({
  name: 'booking-create',
  concurrency: parsePositiveInt(process.env.BOOKING_QUEUE_CONCURRENCY, 5),
  waitTimeoutMs: parsePositiveInt(process.env.BOOKING_QUEUE_WAIT_TIMEOUT_MS, 30 * 1000),
  pollIntervalMs: parsePositiveInt(process.env.BOOKING_QUEUE_POLL_INTERVAL_MS, 200),
  leaseMs: parsePositiveInt(process.env.BOOKING_QUEUE_LEASE_MS, 5 * 60 * 1000)
});

const getActiveQueue = () => (
  canUseMongoSlots() ? mongoBookingQueue : memoryBookingQueue
);

const enqueueBookingCreation = (task) => getActiveQueue().add(task);

const getPurchaseQueueStats = async () => ({
  booking: await getActiveQueue().stats()
});

module.exports = {
  InMemoryTaskQueue,
  MongoSlotQueue,
  enqueueBookingCreation,
  getPurchaseQueueStats
};
