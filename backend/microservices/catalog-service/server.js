process.env.SERVICE_MODE = process.env.SERVICE_MODE || 'microservice';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'catalog-service';
require('../../shared/tracing').startTracing({ serviceName: process.env.SERVICE_NAME });

const createServiceApp = require('../../shared/createServiceApp');
const startHttpService = require('../../shared/startHttpService');
const startCatalogSubscribers = require('../../subscribers/catalogSubscribers');
const catalogServicePackage = require('../../services/catalog/src');

const SERVICE_NAME = 'catalog-service';
const PORT = process.env.CATALOG_SERVICE_PORT || 5102;

const app = createServiceApp({
  serviceName: SERVICE_NAME,
  routes: [
    { path: '/api/companies', router: catalogServicePackage.routes.companies },
    { path: '/api/events', router: catalogServicePackage.routes.events },
    { path: '/api/tickets', router: catalogServicePackage.routes.tickets },
    { path: '/api/upload', router: catalogServicePackage.routes.upload },
    { path: '/internal/catalog', router: catalogServicePackage.routes.internalCatalog }
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
