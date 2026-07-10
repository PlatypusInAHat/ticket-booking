const dotenv = require('dotenv');
dotenv.config();

process.env.SERVICE_MODE = process.env.SERVICE_MODE || 'microservice';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'api-gateway';
require('../../shared/tracing').startTracing({ serviceName: process.env.SERVICE_NAME });

const compression = require('compression');
const cors = require('cors');
const express = require('express');
const jwt = require('jsonwebtoken');
const { correlationIdMiddleware } = require('../../middleware/correlationId');
const errorHandler = require('../../middleware/error');
const { cryptoUtils, corsOptions, serviceUrl } = require('@ticket-booking/platform');
const { requestInternalService } = require('../../shared/internalHttpClient');
const {
  buildHealthPayload,
  checkHttpDependency,
  resolveOverallStatus
} = require('../../shared/healthChecks');
const { createMetricsMiddleware, getServiceMetrics } = require('../../shared/metrics');

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { constantTimeEqual } = cryptoUtils;
const { createCorsOptions } = corsOptions;
const { normalizeServiceUrl } = serviceUrl;

const SERVICE_NAME = process.env.SERVICE_NAME || 'api-gateway';
const PORT = process.env.GATEWAY_PORT || process.env.PORT || 5000;
const UPSTREAM_TIMEOUT_MS = Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 10000);
const UPSTREAM_HEALTH_TIMEOUT_MS = Number(process.env.GATEWAY_UPSTREAM_HEALTH_TIMEOUT_MS || 3000);

const SERVICE_ROUTES = [
  {
    name: 'auth-service',
    prefixes: ['/api/auth', '/api/users', '/api/admin'],
    target: normalizeServiceUrl(process.env.AUTH_SERVICE_URL, 'http://localhost:5101')
  },
  {
    name: 'catalog-service',
    prefixes: ['/api/companies', '/api/events', '/api/tickets', '/api/upload'],
    target: normalizeServiceUrl(process.env.CATALOG_SERVICE_URL, 'http://localhost:5102')
  },
  {
    name: 'booking-service',
    prefixes: ['/api/bookings', '/api/payment'],
    target: normalizeServiceUrl(process.env.BOOKING_SERVICE_URL, 'http://localhost:5103')
  },
  {
    name: 'checkin-service',
    prefixes: ['/api/checkin'],
    target: normalizeServiceUrl(process.env.CHECKIN_SERVICE_URL, 'http://localhost:5104')
  },
  {
    name: 'notification-service',
    prefixes: ['/api/notifications', '/internal/notifications'],
    target: normalizeServiceUrl(process.env.NOTIFICATION_SERVICE_URL, 'http://localhost:5105')
  }
];

const app = express();
app.disable('x-powered-by');
const metrics = getServiceMetrics(SERVICE_NAME);

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ticket Booking API Gateway',
      version: '1.0.0',
      description: 'API Documentation for Ticket Booking Microservices'
    },
    servers: [
      { url: `http://localhost:${PORT}` }
    ]
  },
  apis: ['../../routes/*.js', './server.js']
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(correlationIdMiddleware);
app.use(createMetricsMiddleware(SERVICE_NAME));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors(createCorsOptions()));

const stripHopByHopHeaders = (headers = {}) => {
  const blocked = new Set([
    'connection',
    'content-length',
    'host',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade'
  ]);

  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => {
      const normalizedKey = key.toLowerCase();
      return !blocked.has(normalizedKey) && !normalizedKey.startsWith('access-control-');
    })
  );
};

const forwardRequest = (service) => async (req, res) => {
  const targetUrl = `${service.target}${req.originalUrl}`;

  try {
    const response = await requestInternalService({
      serviceName: service.name,
      baseUrl: service.target,
      path: req.originalUrl,
      method: req.method,
      headers: {
        ...stripHopByHopHeaders(req.headers),
        'x-gateway-service': SERVICE_NAME
      },
      data: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      responseType: 'arraybuffer',
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      validateStatus: () => true,
      rawResponse: true,
      retries: 1,
      retryDelayMs: 150
    });

    Object.entries(stripHopByHopHeaders(response.headers)).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    res.status(response.status).send(response.data);
  } catch (error) {
    res.status(502).json({
      success: false,
      service: SERVICE_NAME,
      upstream: service.name,
      message: 'Upstream service unavailable',
      detail: error.message
    });
  }
};

const checkGatewayDependencies = async () => {
  const dependencies = {};

  await Promise.all(SERVICE_ROUTES.map(async (service) => {
    dependencies[service.name] = await checkHttpDependency(SERVICE_NAME, {
      name: service.name,
      type: 'http-upstream',
      url: `${service.target}/health/ready`,
      timeoutMs: UPSTREAM_HEALTH_TIMEOUT_MS
    });
  }));

  return dependencies;
};

app.get('/health/live', (req, res) => {
  res.json(buildHealthPayload({
    serviceName: SERVICE_NAME,
    status: 'UP'
  }));
});

app.get('/health/ready', async (req, res, next) => {
  try {
    const shouldCheckUpstreams = process.env.GATEWAY_READY_CHECK_UPSTREAMS === 'true';
    const dependencies = shouldCheckUpstreams ? await checkGatewayDependencies() : {};
    const requiredDependencies = shouldCheckUpstreams ? SERVICE_ROUTES.map((service) => service.name) : [];
    const status = resolveOverallStatus(dependencies, requiredDependencies);

    res.status(status === 'UP' ? 200 : 503).json(buildHealthPayload({
      serviceName: SERVICE_NAME,
      status,
      dependencies
    }));
  } catch (error) {
    next(error);
  }
});

app.get('/health/dependencies', async (req, res, next) => {
  try {
    const dependencies = await checkGatewayDependencies();
    const hasDownDependency = Object.values(dependencies).some((dependency) => dependency.status === 'DOWN');

    res.status(hasDownDependency ? 207 : 200).json(buildHealthPayload({
      serviceName: SERVICE_NAME,
      status: hasDownDependency ? 'DEGRADED' : 'UP',
      dependencies
    }));
  } catch (error) {
    next(error);
  }
});

app.get('/metrics', async (req, res, next) => {
  try {
    res.set('Content-Type', metrics.contentType);
    res.end(await metrics.register.metrics());
  } catch (error) {
    next(error);
  }
});

const requireGatewayAdmin = (req, res, next) => {
  const internalKey = process.env.INTERNAL_API_KEY;
  const providedInternalKey = req.get('x-internal-api-key');

  if (internalKey && providedInternalKey && constantTimeEqual(providedInternalKey, internalKey)) {
    return next();
  }

  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice('Bearer '.length)
    : '';

  if (!token || !process.env.JWT_SECRET) {
    return res.status(401).json({
      success: false,
      service: SERVICE_NAME,
      message: 'Gateway admin access required'
    });
  }

  return jwt.verify(token, process.env.JWT_SECRET, (error, payload) => {
    if (error) {
      return res.status(403).json({
        success: false,
        service: SERVICE_NAME,
        message: 'Invalid or expired token'
      });
    }

    if (payload.role !== 'admin') {
      return res.status(403).json({
        success: false,
        service: SERVICE_NAME,
        message: 'Admin role required'
      });
    }

    req.user = payload;
    return next();
  });
};

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    routes: SERVICE_ROUTES.map(({ name, prefixes, target }) => ({ name, prefixes, target }))
  });
});

app.get('/api/admin/gateway/status', requireGatewayAdmin, async (req, res) => {
  const statusPromises = SERVICE_ROUTES.map(async (service) => {
    try {
      const response = await requestInternalService({
        serviceName: service.name,
        baseUrl: service.target,
        path: '/health/ready',
        timeoutMs: 3000,
        retries: 1,
        retryDelayMs: 150,
        rawResponse: true
      });
      return { name: service.name, status: 'UP', detail: response.data };
    } catch (err) {
      return { name: service.name, status: 'DOWN', error: err.message };
    }
  });

  const statuses = await Promise.all(statusPromises);

  res.json({
    gateway: {
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    services: statuses,
    routes: SERVICE_ROUTES
  });
});

SERVICE_ROUTES.forEach((service) => {
  service.prefixes.forEach((prefix) => {
    const proxy = forwardRequest(service);
    app.use(prefix, (req, res) => {
      req.metricsRoute = `${prefix}/*`;
      return proxy(req, res);
    });
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    service: SERVICE_NAME,
    message: 'No gateway route matched'
  });
});

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] running on port ${PORT}`);
  });
}

module.exports = app;
