process.env.SERVICE_MODE = process.env.SERVICE_MODE || 'microservice';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'notification-service';
require('../../shared/tracing').startTracing({ serviceName: process.env.SERVICE_NAME });

const createServiceApp = require('../../shared/createServiceApp');
const startHttpService = require('../../shared/startHttpService');
const { subscribeToDomainEvents } = require('../../shared/domainEventSubscriber');
const EVENTS = require('../../shared/domainEvents');
const publicNotificationRoutes = require('../../services/notification/src/routes/notifications');
const notificationRoutes = require('../../services/notification/src/routes/internal/notifications');
const { startEmailWorker } = require('../../services/notification/src/services/emailQueueService');
const {
  enqueueBookingCancelledEmail,
  enqueueEventReminderEmail,
  enqueuePasswordResetEmail,
  enqueuePaymentCompletedEmail,
  enqueueWelcomeEmail
} = require('../../services/notification/src/services/notificationEventService');
const logger = require('../../utils/logger');

const SERVICE_NAME = 'notification-service';
const PORT = process.env.NOTIFICATION_SERVICE_PORT || process.env.PORT || 5105;

const app = createServiceApp({
  serviceName: SERVICE_NAME,
  health: {
    requiredDependencies: ['mongodb', 'eventBroker']
  },
  routes: [
    { path: '/api/notifications', router: publicNotificationRoutes },
    { path: '/internal/notifications', router: notificationRoutes }
  ]
});

const startNotificationSubscribers = async () => {
  await subscribeToDomainEvents({
    group: SERVICE_NAME,
    handlers: {
      [EVENTS.PAYMENT_COMPLETED]: enqueuePaymentCompletedEmail,
      [EVENTS.USER_REGISTERED]: enqueueWelcomeEmail,
      [EVENTS.PASSWORD_RESET_REQUESTED]: enqueuePasswordResetEmail,
      [EVENTS.BOOKING_CANCELLED]: enqueueBookingCancelledEmail,
      [EVENTS.EVENT_REMINDER_DUE]: enqueueEventReminderEmail
    }
  });
};

startHttpService({
  app,
  serviceName: SERVICE_NAME,
  port: PORT,
  mongoUri: process.env.NOTIFICATION_MONGODB_URI || process.env.MONGODB_URI
}).then(() => {
  if (process.env.NODE_ENV !== 'test') {
    startEmailWorker();
    return startNotificationSubscribers();
  }
  return null;
}).catch((error) => {
  logger.error(`[${SERVICE_NAME}] failed to start: ${error.message}`);
});

module.exports = app;
