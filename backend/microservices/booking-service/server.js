process.env.SERVICE_MODE = process.env.SERVICE_MODE || 'microservice';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'booking-service';
require('../../shared/tracing').startTracing({ serviceName: process.env.SERVICE_NAME });

const bookingRoutes = require('../../routes/bookings');
const paymentRoutes = require('../../routes/payment');
const internalBookingRoutes = require('../../routes/internal/booking');
const createServiceApp = require('../../shared/createServiceApp');
const startHttpService = require('../../shared/startHttpService');
const startBookingSubscribers = require('../../subscribers/bookingSubscribers');
const { startBookingExpirationWorker } = require('../../services/bookingExpirationService');
const { startEventReminderWorker } = require('../../services/eventReminderService');
const { startOutboxPublisher } = require('../../shared/outboxPublisher');

const SERVICE_NAME = 'booking-service';
const PORT = process.env.BOOKING_SERVICE_PORT || 5103;

const app = createServiceApp({
  serviceName: SERVICE_NAME,
  routes: [
    { path: '/api/bookings', router: bookingRoutes },
    { path: '/api/payment', router: paymentRoutes },
    { path: '/internal/booking', router: internalBookingRoutes }
  ]
});

startHttpService({
  app,
  serviceName: SERVICE_NAME,
  port: PORT,
  mongoUri: process.env.BOOKING_MONGODB_URI || process.env.MONGODB_URI
}).then(() => {
  if (process.env.NODE_ENV !== 'test') {
    startBookingExpirationWorker();
    startEventReminderWorker();
    startOutboxPublisher({ serviceName: SERVICE_NAME });
    return startBookingSubscribers();
  }
  return null;
}).catch((error) => {
  console.error(`[${SERVICE_NAME}] failed to start subscribers:`, error.message);
});

module.exports = app;
