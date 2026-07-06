const axios = require('axios');
const mongoose = require('mongoose');
const { isBrokerEnabled, isEventBusConnected } = require('./eventBus');
const { observeDependency } = require('./metrics');

const nowIso = () => new Date().toISOString();

const runTimedCheck = async (fn) => {
  const startedAt = Date.now();
  try {
    const result = await fn();
    return {
      ...result,
      latencyMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      status: 'DOWN',
      latencyMs: Date.now() - startedAt,
      error: error.message
    };
  }
};

const checkMongoDependency = async (serviceName) => {
  const result = await runTimedCheck(async () => {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return {
        status: 'DOWN',
        detail: `mongoose readyState=${mongoose.connection.readyState}`
      };
    }

    await mongoose.connection.db.admin().ping();

    return {
      status: 'UP',
      database: mongoose.connection.name,
      host: mongoose.connection.host
    };
  });

  observeDependency(serviceName, {
    dependency: 'mongodb',
    type: 'database',
    up: result.status === 'UP',
    latencyMs: result.latencyMs
  });

  return result;
};

const checkEventBrokerDependency = async (serviceName) => {
  if (!isBrokerEnabled()) {
    const skipped = {
      status: 'SKIPPED',
      detail: 'EVENT_BROKER_URL is not configured or broker is disabled'
    };

    observeDependency(serviceName, {
      dependency: 'event-broker',
      type: 'broker',
      up: true,
      latencyMs: 0
    });

    return skipped;
  }

  const result = await runTimedCheck(async () => {
    if (!isEventBusConnected()) {
      return {
        status: 'DOWN',
        detail: 'event broker channel is not connected'
      };
    }

    return {
      status: 'UP',
      exchange: process.env.EVENT_EXCHANGE || 'ticket-booking.events'
    };
  });

  observeDependency(serviceName, {
    dependency: 'event-broker',
    type: 'broker',
    up: result.status === 'UP',
    latencyMs: result.latencyMs
  });

  return result;
};

const checkHttpDependency = async (serviceName, {
  name,
  url,
  type = 'http',
  timeoutMs = 3000
}) => {
  const result = await runTimedCheck(async () => {
    const response = await axios.get(url, {
      timeout: timeoutMs,
      validateStatus: () => true
    });

    return {
      status: response.status >= 200 && response.status < 500 ? 'UP' : 'DOWN',
      httpStatus: response.status
    };
  });

  observeDependency(serviceName, {
    dependency: name,
    type,
    up: result.status === 'UP',
    latencyMs: result.latencyMs
  });

  return result;
};

const buildHealthPayload = ({ serviceName, status, dependencies = {} }) => ({
  status,
  service: serviceName,
  timestamp: nowIso(),
  uptimeSeconds: Math.round(process.uptime()),
  dependencies
});

const resolveOverallStatus = (dependencies, requiredDependencies = []) => {
  const hasRequiredDown = requiredDependencies.some((name) => {
    const dependency = dependencies[name];
    return dependency && dependency.status === 'DOWN';
  });

  return hasRequiredDown ? 'DOWN' : 'UP';
};

const runDependencyChecks = async ({
  serviceName,
  includeDatabase = true,
  includeBroker = true,
  httpDependencies = []
}) => {
  const dependencies = {};

  if (includeDatabase) {
    dependencies.mongodb = await checkMongoDependency(serviceName);
  }

  if (includeBroker) {
    dependencies.eventBroker = await checkEventBrokerDependency(serviceName);
  }

  await Promise.all(httpDependencies.map(async (dependency) => {
    dependencies[dependency.name] = await checkHttpDependency(serviceName, dependency);
  }));

  return dependencies;
};

module.exports = {
  buildHealthPayload,
  checkEventBrokerDependency,
  checkHttpDependency,
  checkMongoDependency,
  resolveOverallStatus,
  runDependencyChecks
};
