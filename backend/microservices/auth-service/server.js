process.env.SERVICE_MODE = process.env.SERVICE_MODE || 'microservice';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'auth-service';
require('../../shared/tracing').startTracing({ serviceName: process.env.SERVICE_NAME });

const authRoutes = require('../../routes/auth');
const userRoutes = require('../../routes/users');
const adminRoutes = require('../../routes/admin');
const createServiceApp = require('../../shared/createServiceApp');
const startHttpService = require('../../shared/startHttpService');
const startAuthSubscribers = require('../../subscribers/authSubscribers');
const { startOutboxPublisher } = require('../../shared/outboxPublisher');

const SERVICE_NAME = 'auth-service';
const PORT = process.env.AUTH_SERVICE_PORT || 5101;

const app = createServiceApp({
  serviceName: SERVICE_NAME,
  routes: [
    { path: '/api/auth', router: authRoutes },
    { path: '/api/users', router: userRoutes },
    { path: '/api/admin', router: adminRoutes }
  ]
});

startHttpService({
  app,
  serviceName: SERVICE_NAME,
  port: PORT,
  mongoUri: process.env.AUTH_MONGODB_URI || process.env.MONGODB_URI
}).then(() => {
  if (process.env.NODE_ENV !== 'test') {
    startOutboxPublisher({ serviceName: SERVICE_NAME });
    return startAuthSubscribers();
  }
  return null;
}).catch((error) => {
  console.error(`[${SERVICE_NAME}] failed to start subscribers:`, error.message);
});

module.exports = app;
