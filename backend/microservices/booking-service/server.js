process.env.SERVICE_MODE = process.env.SERVICE_MODE || 'microservice';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'booking-service';
require('../../shared/tracing').startTracing({ serviceName: process.env.SERVICE_NAME });

const createServiceApp = require('../../shared/createServiceApp');
const startHttpService = require('../../shared/startHttpService');
const startBookingSubscribers = require('../../subscribers/bookingSubscribers');
const { startOutboxPublisher } = require('../../shared/outboxPublisher');
const bookingServicePackage = require('../../services/booking/src');
const { startBookingExpirationWorker } = bookingServicePackage.services.bookingExpiration;
const { startEventReminderWorker } = bookingServicePackage.services.eventReminder;

const SERVICE_NAME = 'booking-service';
const PORT = process.env.BOOKING_SERVICE_PORT || 5103;

const app = createServiceApp({
  serviceName: SERVICE_NAME,
  routes: [
    { path: '/api/bookings', router: bookingServicePackage.routes.bookings },
    { path: '/api/payment', router: bookingServicePackage.routes.payment },
    { path: '/internal/booking', router: bookingServicePackage.routes.internalBooking }
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
