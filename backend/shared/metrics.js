const promClient = require('prom-client');

const metricsByService = new Map();

const normalizeRoute = (req) => {
  if (req.metricsRoute) {
    return req.metricsRoute;
  }

  const routePath = req.route?.path;
  const baseUrl = req.baseUrl || '';

  if (routePath) {
    return `${baseUrl}${routePath}` || req.path || 'unknown';
  }

  return (req.path || req.originalUrl || 'unknown')
    .split('?')[0]
    .replace(/\/[0-9a-fA-F]{24}(?=\/|$)/g, '/:id')
    .replace(/\/[0-9]+(?=\/|$)/g, '/:id');
};

const getServiceMetrics = (serviceName) => {
  if (metricsByService.has(serviceName)) {
    return metricsByService.get(serviceName);
  }

  const register = new promClient.Registry();
  register.setDefaultLabels({
    service: serviceName,
    environment: process.env.NODE_ENV || 'development'
  });

  promClient.collectDefaultMetrics({
    register,
    prefix: 'ticketstage_process_'
  });

  const httpRequestsTotal = new promClient.Counter({
    name: 'ticketstage_http_requests_total',
    help: 'Total HTTP requests handled by the service.',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
  });

  const httpRequestErrorsTotal = new promClient.Counter({
    name: 'ticketstage_http_request_errors_total',
    help: 'Total HTTP requests returning 5xx responses.',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
  });

  const httpRequestDurationSeconds = new promClient.Histogram({
    name: 'ticketstage_http_request_duration_seconds',
    help: 'HTTP request duration in seconds.',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register]
  });

  const httpRequestsInFlight = new promClient.Gauge({
    name: 'ticketstage_http_requests_in_flight',
    help: 'HTTP requests currently being processed.',
    labelNames: ['method'],
    registers: [register]
  });

  const dependencyUp = new promClient.Gauge({
    name: 'ticketstage_dependency_up',
    help: 'Dependency availability: 1 up, 0 down.',
    labelNames: ['dependency', 'type'],
    registers: [register]
  });

  const dependencyLatencySeconds = new promClient.Histogram({
    name: 'ticketstage_dependency_latency_seconds',
    help: 'Dependency health check latency in seconds.',
    labelNames: ['dependency', 'type'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [register]
  });

  const queueDepth = new promClient.Gauge({
    name: 'ticketstage_queue_depth',
    help: 'Queue depth by queue and state.',
    labelNames: ['queue', 'state'],
    registers: [register]
  });

  const outboxEvents = new promClient.Gauge({
    name: 'ticketstage_outbox_events',
    help: 'Outbox event count by status.',
    labelNames: ['status'],
    registers: [register]
  });

  const outboxOldestPendingAgeSeconds = new promClient.Gauge({
    name: 'ticketstage_outbox_oldest_pending_age_seconds',
    help: 'Age in seconds of the oldest pending outbox event.',
    registers: [register]
  });

  const emailJobs = new promClient.Gauge({
    name: 'ticketstage_email_jobs',
    help: 'Email job count by status.',
    labelNames: ['status'],
    registers: [register]
  });

  const emailOldestQueuedAgeSeconds = new promClient.Gauge({
    name: 'ticketstage_email_oldest_queued_age_seconds',
    help: 'Age in seconds of the oldest queued email job.',
    registers: [register]
  });

  const metrics = {
    register,
    contentType: register.contentType,
    httpRequestsTotal,
    httpRequestErrorsTotal,
    httpRequestDurationSeconds,
    httpRequestsInFlight,
    dependencyUp,
    dependencyLatencySeconds,
    queueDepth,
    outboxEvents,
    outboxOldestPendingAgeSeconds,
    emailJobs,
    emailOldestQueuedAgeSeconds
  };

  metricsByService.set(serviceName, metrics);
  return metrics;
};

const createMetricsMiddleware = (serviceName) => {
  const metrics = getServiceMetrics(serviceName);

  return (req, res, next) => {
    if (req.path === '/metrics') {
      return next();
    }

    const endTimer = metrics.httpRequestDurationSeconds.startTimer();
    metrics.httpRequestsInFlight.inc({ method: req.method });

    res.on('finish', () => {
      const labels = {
        method: req.method,
        route: normalizeRoute(req),
        status_code: String(res.statusCode)
      };

      endTimer(labels);
      metrics.httpRequestsTotal.inc(labels);

      if (res.statusCode >= 500) {
        metrics.httpRequestErrorsTotal.inc(labels);
      }

      metrics.httpRequestsInFlight.dec({ method: req.method });
    });

    return next();
  };
};

const observeDependency = (serviceName, { dependency, type, up, latencyMs }) => {
  const metrics = getServiceMetrics(serviceName);
  const labels = { dependency, type };

  metrics.dependencyUp.set(labels, up ? 1 : 0);

  if (Number.isFinite(latencyMs)) {
    metrics.dependencyLatencySeconds.observe(labels, latencyMs / 1000);
  }
};

const setQueueDepth = (serviceName, queue, state, value) => {
  getServiceMetrics(serviceName).queueDepth.set({ queue, state }, value);
};

const setOutboxEvents = (serviceName, status, value) => {
  getServiceMetrics(serviceName).outboxEvents.set({ status }, value);
};

const setOutboxOldestPendingAgeSeconds = (serviceName, value) => {
  getServiceMetrics(serviceName).outboxOldestPendingAgeSeconds.set(value);
};

const setEmailJobs = (serviceName, status, value) => {
  getServiceMetrics(serviceName).emailJobs.set({ status }, value);
};

const setEmailOldestQueuedAgeSeconds = (serviceName, value) => {
  getServiceMetrics(serviceName).emailOldestQueuedAgeSeconds.set(value);
};

module.exports = {
  createMetricsMiddleware,
  getServiceMetrics,
  observeDependency,
  setEmailJobs,
  setEmailOldestQueuedAgeSeconds,
  setOutboxEvents,
  setOutboxOldestPendingAgeSeconds,
  setQueueDepth
};
