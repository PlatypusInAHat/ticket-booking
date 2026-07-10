process.env.SERVICE_MODE = process.env.SERVICE_MODE || 'microservice';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'notification-service';
require('../../shared/tracing').startTracing({ serviceName: process.env.SERVICE_NAME });

const createServiceApp = require('../../shared/createServiceApp');
const startHttpService = require('../../shared/startHttpService');
const { subscribeToDomainEvents } = require('../../shared/domainEventSubscriber');
const { domainEvents, logger } = require('@ticket-booking/platform');
const notificationServicePackage = require('../../services/notification/src');
const EVENTS = domainEvents;
const { startEmailWorker } = notificationServicePackage.services.emailQueue;
const {
  enqueueBookingCancelledEmail,
  enqueueEventReminderEmail,
  enqueuePasswordResetEmail,
  enqueuePaymentCompletedEmail,
  enqueueWelcomeEmail
} = notificationServicePackage.services.notificationEvents;

const SERVICE_NAME = 'notification-service';
const PORT = process.env.NOTIFICATION_SERVICE_PORT || process.env.PORT || 5105;

const app = createServiceApp({
  serviceName: SERVICE_NAME,
  health: {
    requiredDependencies: ['mongodb', 'eventBroker']
  },
  routes: [
    { path: '/api/notifications', router: notificationServicePackage.routes.notifications },
    { path: '/internal/notifications', router: notificationServicePackage.routes.internalNotifications }
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
