const express = require('express');
const cors = require('cors');
const compression = require('compression');
const errorHandler = require('../middleware/error');
const { correlationIdMiddleware } = require('../middleware/correlationId');
const { logger, corsOptions } = require('@ticket-booking/platform');
const {
  buildHealthPayload,
  resolveOverallStatus,
  runDependencyChecks
} = require('./healthChecks');
const { createMetricsMiddleware, getServiceMetrics } = require('./metrics');
const { collectRuntimeMetrics } = require('./runtimeMetrics');

const DEFAULT_BODY_LIMIT = '10mb';
const { createCorsOptions } = corsOptions;

const createServiceApp = ({
  serviceName,
  routes = [],
  healthPath = '/health',
  corsOptions = createCorsOptions(),
  health = {}
}) => {
  const app = express();
  const requiredDependencies = health.requiredDependencies || ['mongodb'];
  const includeDatabase = health.includeDatabase !== false;
  const includeBroker = health.includeBroker !== false;
  const metrics = getServiceMetrics(serviceName);

  app.use(correlationIdMiddleware);
  app.use(createMetricsMiddleware(serviceName));

  app.use((req, res, next) => {
    logger.info(`[${req.method}] ${req.url}`);
    next();
  });

  app.use(compression());
  app.use(express.json({ limit: DEFAULT_BODY_LIMIT }));
  app.use(express.urlencoded({ limit: DEFAULT_BODY_LIMIT, extended: true }));
  app.use(cors(corsOptions));

  app.get('/health/live', (req, res) => {
    res.json(buildHealthPayload({
      serviceName,
      status: 'UP'
    }));
  });

  const readinessHandler = async (req, res, next) => {
    try {
      const dependencies = await runDependencyChecks({
        serviceName,
        includeDatabase,
        includeBroker,
        httpDependencies: health.httpDependencies || []
      });
      const status = resolveOverallStatus(dependencies, requiredDependencies);

      res.status(status === 'UP' ? 200 : 503).json(buildHealthPayload({
        serviceName,
        status,
        dependencies
      }));
    } catch (error) {
      next(error);
    }
  };

  app.get('/health/ready', readinessHandler);

  app.get('/health/dependencies', async (req, res, next) => {
    try {
      const dependencies = await runDependencyChecks({
        serviceName,
        includeDatabase,
        includeBroker,
        httpDependencies: health.httpDependencies || []
      });
      const hasDownDependency = Object.values(dependencies).some((dependency) => dependency.status === 'DOWN');

      res.status(hasDownDependency ? 207 : 200).json(buildHealthPayload({
        serviceName,
        status: hasDownDependency ? 'DEGRADED' : 'UP',
        dependencies
      }));
    } catch (error) {
      next(error);
    }
  });

  app.get(healthPath, readinessHandler);

  if (healthPath !== '/health') {
    app.get('/health', readinessHandler);
  }

  app.get('/metrics', async (req, res, next) => {
    try {
      await collectRuntimeMetrics(serviceName);
      res.set('Content-Type', metrics.contentType);
      res.end(await metrics.register.metrics());
    } catch (error) {
      next(error);
    }
  });

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
