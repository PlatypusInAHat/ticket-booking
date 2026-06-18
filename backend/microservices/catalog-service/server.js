process.env.SERVICE_MODE = process.env.SERVICE_MODE || 'microservice';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'catalog-service';

const companyRoutes = require('../../routes/companies');
const eventRoutes = require('../../routes/events');
const ticketRoutes = require('../../routes/tickets');
const internalCatalogRoutes = require('../../routes/internal/catalog');
const createServiceApp = require('../../shared/createServiceApp');
const startHttpService = require('../../shared/startHttpService');
const startCatalogSubscribers = require('../../subscribers/catalogSubscribers');

const SERVICE_NAME = 'catalog-service';
const PORT = process.env.CATALOG_SERVICE_PORT || 5102;

const uploadRoutes = require('../../routes/upload');

const app = createServiceApp({
  serviceName: SERVICE_NAME,
  routes: [
    { path: '/api/companies', router: companyRoutes },
    { path: '/api/events', router: eventRoutes },
    { path: '/api/tickets', router: ticketRoutes },
    { path: '/api/upload', router: uploadRoutes },
    { path: '/internal/catalog', router: internalCatalogRoutes }
  ]
});

startHttpService({
  app,
  serviceName: SERVICE_NAME,
  port: PORT,
  mongoUri: process.env.CATALOG_MONGODB_URI || process.env.MONGODB_URI
}).then(() => {
  if (process.env.NODE_ENV !== 'test') {
    return startCatalogSubscribers();
  }
  return null;
}).catch((error) => {
  console.error(`[${SERVICE_NAME}] failed to start subscribers:`, error.message);
});

module.exports = app;
