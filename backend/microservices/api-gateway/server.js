const axios = require('axios');
const compression = require('compression');
const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');

dotenv.config();

const SERVICE_NAME = 'api-gateway';
const PORT = process.env.GATEWAY_PORT || process.env.PORT || 5000;

const SERVICE_ROUTES = [
  {
    name: 'auth-service',
    prefixes: ['/api/auth', '/api/users', '/api/admin'],
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:5101'
  },
  {
    name: 'catalog-service',
    prefixes: ['/api/companies', '/api/events', '/api/tickets'],
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

app.use(compression());
app.use('/api/payment/webhooks/stripe', express.raw({ type: 'application/json', limit: '2mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

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
    Object.entries(headers).filter(([key]) => !blocked.has(key.toLowerCase()))
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

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    routes: SERVICE_ROUTES.map(({ name, prefixes, target }) => ({ name, prefixes, target }))
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
