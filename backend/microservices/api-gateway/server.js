const axios = require('axios');
const compression = require('compression');
const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const jwt = require('jsonwebtoken');
const { constantTimeEqual } = require('../../utils/cryptoUtils');
const { createCorsOptions } = require('../../utils/corsOptions');

dotenv.config();

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const SERVICE_NAME = 'api-gateway';
const PORT = process.env.GATEWAY_PORT || process.env.PORT || 5000;
const UPSTREAM_TIMEOUT_MS = Number(process.env.GATEWAY_UPSTREAM_TIMEOUT_MS || 10000);

const SERVICE_ROUTES = [
  {
    name: 'auth-service',
    prefixes: ['/api/auth', '/api/users', '/api/admin'],
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:5101'
  },
  {
    name: 'catalog-service',
    prefixes: ['/api/companies', '/api/events', '/api/tickets', '/api/upload'],
    target: process.env.CATALOG_SERVICE_URL || 'http://localhost:5102'
  },
  {
    name: 'booking-service',
    prefixes: ['/api/bookings', '/api/payment'],
    target: process.env.BOOKING_SERVICE_URL || 'http://localhost:5103'
  },
  {
    name: 'checkin-service',
    prefixes: ['/api/checkin'],
    target: process.env.CHECKIN_SERVICE_URL || 'http://localhost:5104'
  }
];

const app = express();

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
    const response = await axios({
      url: targetUrl,
      method: req.method,
      headers: {
        ...stripHopByHopHeaders(req.headers),
        'x-gateway-service': SERVICE_NAME
      },
      data: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      responseType: 'arraybuffer',
      timeout: UPSTREAM_TIMEOUT_MS,
      validateStatus: () => true
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

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (payload.role !== 'admin') {
      return res.status(403).json({
        success: false,
        service: SERVICE_NAME,
        message: 'Admin role required'
      });
    }

    req.user = payload;
    return next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      service: SERVICE_NAME,
      message: 'Invalid or expired token'
    });
  }
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
      const response = await axios.get(`${service.target}/health`, { timeout: 3000 });
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
    app.use(prefix, forwardRequest(service));
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    service: SERVICE_NAME,
    message: 'No gateway route matched'
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] running on port ${PORT}`);
  });
}

module.exports = app;
