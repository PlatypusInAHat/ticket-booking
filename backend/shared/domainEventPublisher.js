const { publishEvent } = require('./eventBus');
const { enqueueOutboxEvent } = require('./outboxPublisher');

const publishDomainEvent = async (type, payload = {}, options = {}) => {
  const useOutbox = process.env.OUTBOX_ENABLED !== 'false';

  if (useOutbox) {
    try {
      const queued = await enqueueOutboxEvent(type, payload, options);

      if (queued) {
        return true;
      }
    } catch (error) {
      console.error(`[outbox] failed to enqueue ${type}:`, error.message);
    }
  }

  return publishEvent(type, payload, options);
};

module.exports = {
  publishDomainEvent
};
