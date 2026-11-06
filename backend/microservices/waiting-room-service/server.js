process.env.SERVICE_MODE = process.env.SERVICE_MODE || 'microservice';
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'waiting-room-service';
require('../../shared/tracing').startTracing({ serviceName: process.env.SERVICE_NAME });

const createServiceApp = require('../../shared/createServiceApp');
const routes = require('../../services/waiting-room/src/routes');
const { getRedisClient } = require('../../shared/redisClient');

const checkRedis = async () => {
  const startedAt = Date.now();
  try {
    const redis = await getRedisClient();
    await redis.ping();
    return { redis: { status: 'UP', latencyMs: Date.now() - startedAt } };
  } catch (error) {
    return { redis: { status: 'DOWN', latencyMs: Date.now() - startedAt, error: error.message } };
  }
};

const app = createServiceApp({
  serviceName: 'waiting-room-service',
  routes: [{ path: '/api/waiting-room', router: routes }],
  health: {
    includeDatabase: false,
    includeBroker: false,
    requiredDependencies: ['redis'],
    checkDependencies: checkRedis
  }
});

const port = process.env.WAITING_ROOM_SERVICE_PORT || 5106;
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`[waiting-room-service] running on port ${port}`));
}

module.exports = app;
