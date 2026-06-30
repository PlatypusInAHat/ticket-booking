const express = require('express');
const cors = require('cors');
const compression = require('compression');
const errorHandler = require('../middleware/error');
const { correlationIdMiddleware } = require('../middleware/correlationId');
const logger = require('../utils/logger');

const DEFAULT_BODY_LIMIT = '10mb';

const createServiceApp = ({
  serviceName,
  routes = [],
  healthPath = '/health',
  corsOrigin = process.env.FRONTEND_URL || 'http://localhost:5173'
}) => {
  const app = express();

  app.use(correlationIdMiddleware);
  
  app.use((req, res, next) => {
    logger.info(`[${req.method}] ${req.url}`);
    next();
  });

  app.use(compression());
  app.use(express.json({ limit: DEFAULT_BODY_LIMIT }));
  app.use(express.urlencoded({ limit: DEFAULT_BODY_LIMIT, extended: true }));
  app.use(cors({
    origin: corsOrigin,
    credentials: true
  }));

  app.get(healthPath, (req, res) => {
    res.json({
      status: 'OK',
      service: serviceName,
      timestamp: new Date().toISOString()
    });
  });

  if (healthPath !== '/health') {
    app.get('/health', (req, res) => {
      res.json({
        status: 'OK',
        service: serviceName,
        timestamp: new Date().toISOString()
      });
    });
  }

  routes.forEach(({ path, router }) => {
    app.use(path, router);
  });

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      service: serviceName,
      message: 'Route not found'
    });
  });

  app.use(errorHandler);

  return app;
};

module.exports = createServiceApp;
