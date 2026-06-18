const ApiError = require('../utils/ApiError');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

class TaskQueue {
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
      throw new ApiError(429, 'He thong ban ve dang qua tai. Vui long thu lai sau it phut.');
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
        reject(new ApiError(503, 'Hang doi mua ve dang qua tai. Vui long thu lai sau.'));
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

const bookingQueue = new TaskQueue({
  name: 'booking-create',
  concurrency: parsePositiveInt(process.env.BOOKING_QUEUE_CONCURRENCY, 5),
  maxSize: parsePositiveInt(process.env.BOOKING_QUEUE_MAX_SIZE, 500),
  waitTimeoutMs: parsePositiveInt(process.env.BOOKING_QUEUE_WAIT_TIMEOUT_MS, 30 * 1000)
});

const enqueueBookingCreation = (task) => bookingQueue.add(task);

const getPurchaseQueueStats = () => ({
  booking: bookingQueue.stats()
});

module.exports = {
  TaskQueue,
  enqueueBookingCreation,
  getPurchaseQueueStats
};
