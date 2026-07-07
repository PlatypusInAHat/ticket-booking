const crypto = require('crypto');
const {
  SpanKind,
  SpanStatusCode,
  context,
  propagation,
  trace
} = require('@opentelemetry/api');
const {
  claimEvent,
  markEventCompleted,
  markEventFailed
} = require('./eventConsumerIdempotency');

const EXCHANGE_NAME = process.env.EVENT_EXCHANGE || 'ticket-booking.events';
const DEFAULT_PREFETCH = 10;
const DEFAULT_RETRY_DELAY_MS = 15000;
const DEFAULT_MAX_RETRIES = 5;

let amqp;
let connection;
let channel;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getTracer = () => trace.getTracer('ticketstage-event-bus');

const getTraceCarrier = () => {
  const carrier = {};
  propagation.inject(context.active(), carrier);
  return carrier;
};

const isBrokerEnabled = () => {
  return process.env.EVENT_BROKER_ENABLED !== 'false' && Boolean(process.env.EVENT_BROKER_URL);
};

const isEventBusConnected = () => Boolean(connection && channel);

const getAmqp = () => {
  if (!amqp) {
    // Loaded lazily so monolith/local mode can run even when RabbitMQ is not installed yet.
    // eslint-disable-next-line global-require
    amqp = require('amqplib');
  }

  return amqp;
};

const connectEventBus = async () => {
  if (!isBrokerEnabled()) {
    return null;
  }

  if (channel) {
    return channel;
  }

  const client = getAmqp();
  const retries = Math.max(1, Number(process.env.EVENT_BROKER_RETRIES || 10));
  const retryDelayMs = Math.max(100, Number(process.env.EVENT_BROKER_RETRY_DELAY_MS || 2000));

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      connection = await client.connect(process.env.EVENT_BROKER_URL);
      break;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }

      console.warn(`[event-bus] connect attempt ${attempt}/${retries} failed: ${error.message}`);
      await wait(retryDelayMs);
    }
  }

  channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

  connection.on('close', () => {
    channel = null;
    connection = null;
  });

  connection.on('error', (error) => {
    console.error('[event-bus] connection error:', error.message);
  });

  return channel;
};

const buildEnvelope = (type, payload = {}, source = process.env.SERVICE_NAME || 'unknown-service') => ({
  id: crypto.randomUUID(),
  type,
  source,
  payload,
  traceContext: getTraceCarrier(),
  occurredAt: new Date().toISOString()
});

const publishEnvelope = async (envelope) => {
  if (!isBrokerEnabled()) {
    return false;
  }

  const parentContext = propagation.extract(context.active(), envelope.traceContext || {});

  return context.with(parentContext, () => getTracer().startActiveSpan(
    `event publish ${envelope.type}`,
    {
      kind: SpanKind.PRODUCER,
      attributes: {
        'messaging.system': 'rabbitmq',
        'messaging.destination.name': EXCHANGE_NAME,
        'messaging.operation.name': 'publish',
        'messaging.message.id': envelope.id,
        'messaging.message.type': envelope.type
      }
    },
    async (span) => {
      try {
        const activeChannel = await connectEventBus();
        const headers = {};
        propagation.inject(context.active(), headers);

        activeChannel.publish(
          EXCHANGE_NAME,
          envelope.type,
          Buffer.from(JSON.stringify(envelope)),
          {
            contentType: 'application/json',
            persistent: true,
            messageId: envelope.id,
            timestamp: Date.now(),
            headers
          }
        );

        span.setStatus({ code: SpanStatusCode.OK });
        return true;
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        console.error(`[event-bus] failed to publish ${envelope.type}:`, error.message);
        return false;
      } finally {
        span.end();
      }
    }
  ));
};

const publishEvent = async (type, payload = {}, options = {}) => {
  const envelope = buildEnvelope(type, payload, options.source);
  return publishEnvelope(envelope);
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getRetryCount = (message) => {
  const retryCount = Number.parseInt(message.properties.headers?.['x-retry-count'] || '0', 10);
  return Number.isFinite(retryCount) ? retryCount : 0;
};

const publishToQueue = (activeChannel, queueName, message, headers = {}) => {
  activeChannel.sendToQueue(
    queueName,
    message.content,
    {
      ...message.properties,
      persistent: true,
      headers: {
        ...(message.properties.headers || {}),
        ...headers
      }
    }
  );
};

const subscribeEvents = async ({ serviceName, routingKeys, handler }) => {
  if (!isBrokerEnabled()) {
    return false;
  }

  const activeChannel = await connectEventBus();
  const queueName = `${serviceName}.events`;
  const retryQueueName = `${queueName}.retry`;
  const deadQueueName = `${queueName}.dead`;
  const retryDelayMs = parsePositiveInt(process.env.EVENT_RETRY_DELAY_MS, DEFAULT_RETRY_DELAY_MS);
  const maxRetries = parsePositiveInt(process.env.EVENT_MAX_RETRIES, DEFAULT_MAX_RETRIES);
  const prefetch = parsePositiveInt(process.env.EVENT_CONSUMER_PREFETCH, DEFAULT_PREFETCH);

  await activeChannel.assertQueue(queueName, { durable: true });
  await activeChannel.assertQueue(retryQueueName, {
    durable: true,
    arguments: {
      'x-message-ttl': retryDelayMs,
      'x-dead-letter-exchange': '',
      'x-dead-letter-routing-key': queueName
    }
  });
  await activeChannel.assertQueue(deadQueueName, { durable: true });
  activeChannel.prefetch(prefetch);

  await Promise.all(
    routingKeys.map((routingKey) => activeChannel.bindQueue(queueName, EXCHANGE_NAME, routingKey))
  );

  await activeChannel.consume(queueName, async (message) => {
    if (!message) {
      return;
    }

    const parentContext = propagation.extract(context.active(), message.properties.headers || {});

    await context.with(parentContext, async () => getTracer().startActiveSpan(
      `event consume ${message.fields.routingKey}`,
      {
        kind: SpanKind.CONSUMER,
        attributes: {
          'messaging.system': 'rabbitmq',
          'messaging.destination.name': queueName,
          'messaging.operation.name': 'process',
          'messaging.rabbitmq.routing_key': message.fields.routingKey,
          'messaging.message.id': message.properties.messageId || ''
        }
      },
      async (span) => {
        let envelope;
        let eventId = '';
        try {
          envelope = JSON.parse(message.content.toString());
          eventId = envelope.id || message.properties.messageId || '';
          span.setAttribute('messaging.message.type', envelope.type);
          const claim = await claimEvent({
            consumerGroup: serviceName,
            eventId,
            eventType: envelope.type,
            metadata: {
              routingKey: message.fields.routingKey
            }
          });

          if (claim.skipped) {
            span.setAttribute('messaging.message.deduplicated', true);
            span.setAttribute('messaging.message.deduplicated_reason', claim.reason || 'skipped');
            span.setStatus({ code: SpanStatusCode.OK });
            activeChannel.ack(message);
            return;
          }

          await handler(envelope);
          await markEventCompleted({ consumerGroup: serviceName, eventId });
          span.setStatus({ code: SpanStatusCode.OK });
          activeChannel.ack(message);
        } catch (error) {
          const retryCount = getRetryCount(message);
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
          span.setAttribute('messaging.message.retry_count', retryCount);
          console.error(`[event-bus] ${serviceName} handler failed:`, error.message);
          await markEventFailed({ consumerGroup: serviceName, eventId, error });

          if (retryCount < maxRetries) {
            publishToQueue(activeChannel, retryQueueName, message, {
              'x-retry-count': retryCount + 1,
              'x-last-error': error.message
            });
          } else {
            publishToQueue(activeChannel, deadQueueName, message, {
              'x-retry-count': retryCount,
              'x-dead-lettered-at': new Date().toISOString(),
              'x-last-error': error.message
            });
            console.error(`[event-bus] ${serviceName} moved message to DLQ after ${retryCount} retries`);
          }

          activeChannel.ack(message);
        } finally {
          span.end();
        }
      }
    ));
  });

  console.log(`[event-bus] ${serviceName} subscribed: ${routingKeys.join(', ')} (retry=${retryDelayMs}ms, maxRetries=${maxRetries})`);
  return true;
};

const closeEventBus = async () => {
  if (channel) {
    await channel.close();
    channel = null;
  }

  if (connection) {
    await connection.close();
    connection = null;
  }
};

module.exports = {
  buildEnvelope,
  closeEventBus,
  connectEventBus,
  isEventBusConnected,
  isBrokerEnabled,
  publishEnvelope,
  publishEvent,
  subscribeEvents
};
