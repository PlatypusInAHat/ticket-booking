process.env.SERVICE_MODE = process.env.SERVICE_MODE || 'microservice';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'checkin-service';
require('../../shared/tracing').startTracing({ serviceName: process.env.SERVICE_NAME });

const checkinRoutes = require('../../routes/checkin');
const internalCheckinRoutes = require('../../routes/internal/checkin');
const createServiceApp = require('../../shared/createServiceApp');
const startHttpService = require('../../shared/startHttpService');
const startCheckinSubscribers = require('../../subscribers/checkinSubscribers');
const { startOutboxPublisher } = require('../../shared/outboxPublisher');

const SERVICE_NAME = 'checkin-service';
const PORT = process.env.CHECKIN_SERVICE_PORT || 5104;

const app = createServiceApp({
  serviceName: SERVICE_NAME,
  routes: [
    { path: '/api/checkin', router: checkinRoutes },
    { path: '/internal/checkin', router: internalCheckinRoutes }
  ]
});

startHttpService({
  app,
  serviceName: SERVICE_NAME,
  port: PORT,
  mongoUri: process.env.CHECKIN_MONGODB_URI || process.env.MONGODB_URI
}).then(() => {
  if (process.env.NODE_ENV !== 'test') {
    startOutboxPublisher({ serviceName: SERVICE_NAME });
    return startCheckinSubscribers();
  }
  return null;
}).catch((error) => {
  console.error(`[${SERVICE_NAME}] failed to start subscribers:`, error.message);
});

module.exports = app;
