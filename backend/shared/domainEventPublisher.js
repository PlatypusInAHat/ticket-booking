const { publishEvent } = require('./eventBus');
const { enqueueOutboxEvent } = require('./outboxPublisher');
const { logger } = require('@ticket-booking/platform');

const publishDomainEvent = async (type, payload = {}, options = {}) => {
  const useOutbox = process.env.OUTBOX_ENABLED !== 'false';

  if (useOutbox) {
    try {
      const queued = await enqueueOutboxEvent(type, payload, options);

      if (queued) {
        return true;
      }
    } catch (error) {
      logger.error(`[outbox] failed to enqueue ${type}: ${error.message}`);

      if (options.session) {
        throw error;
      }
    }
  }

  if (options.session) {
    throw new Error(`Outbox is required for transactional event ${type}`);
  }

  return publishEvent(type, payload, options);
};

module.exports = {
  publishDomainEvent
};
