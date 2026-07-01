const winston = require('winston');
const { getCorrelationId } = require('../middleware/correlationId');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format((info) => {
    const correlationId = getCorrelationId();
    if (correlationId) {
      info.correlationId = correlationId;
    }
    return info;
  })(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: process.env.SERVICE_NAME || 'ticket-booking-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, correlationId, service, stack }) => {
          const id = correlationId ? ` [${correlationId}]` : '';
          const srv = service ? ` (${service})` : '';
          return `${timestamp} ${level}${srv}${id}: ${message} ${stack || ''}`;
        })
      ),
    }),
  ],
});

module.exports = logger;
