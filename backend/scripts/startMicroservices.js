const path = require('path');
const { spawn } = require('child_process');

const backendRoot = path.resolve(__dirname, '..');

const serviceDefinitions = [
  {
    name: 'auth-service',
    script: 'microservices/auth-service/server.js',
    env: {
      SERVICE_MODE: 'microservice',
      SERVICE_NAME: 'auth-service',
      AUTH_SERVICE_PORT: process.env.AUTH_SERVICE_PORT || '5101',
      AUTH_MONGODB_URI: process.env.AUTH_MONGODB_URI || 'mongodb://localhost:27017/ticket-auth',
      CATALOG_SERVICE_URL: process.env.CATALOG_SERVICE_URL || 'http://localhost:5102',
      BOOKING_SERVICE_URL: process.env.BOOKING_SERVICE_URL || 'http://localhost:5103',
      CHECKIN_SERVICE_URL: process.env.CHECKIN_SERVICE_URL || 'http://localhost:5104'
    }
  },
  {
    name: 'catalog-service',
    script: 'microservices/catalog-service/server.js',
    env: {
      SERVICE_MODE: 'microservice',
      SERVICE_NAME: 'catalog-service',
      CATALOG_SERVICE_PORT: process.env.CATALOG_SERVICE_PORT || '5102',
      CATALOG_MONGODB_URI: process.env.CATALOG_MONGODB_URI || 'mongodb://localhost:27017/ticket-catalog'
    }
  },
  {
    name: 'booking-service',
    script: 'microservices/booking-service/server.js',
    env: {
      SERVICE_MODE: 'microservice',
      SERVICE_NAME: 'booking-service',
      BOOKING_SERVICE_PORT: process.env.BOOKING_SERVICE_PORT || '5103',
      BOOKING_MONGODB_URI: process.env.BOOKING_MONGODB_URI || 'mongodb://localhost:27017/ticket-booking',
      CATALOG_SERVICE_URL: process.env.CATALOG_SERVICE_URL || 'http://localhost:5102'
    }
  },
  {
    name: 'checkin-service',
    script: 'microservices/checkin-service/server.js',
    env: {
      SERVICE_MODE: 'microservice',
      SERVICE_NAME: 'checkin-service',
      CHECKIN_SERVICE_PORT: process.env.CHECKIN_SERVICE_PORT || '5104',
      CHECKIN_MONGODB_URI: process.env.CHECKIN_MONGODB_URI || 'mongodb://localhost:27017/ticket-checkin'
    }
  },
  {
    name: 'api-gateway',
    script: 'microservices/api-gateway/server.js',
    env: {
      SERVICE_MODE: 'microservice',
      SERVICE_NAME: 'api-gateway',
      GATEWAY_PORT: process.env.GATEWAY_PORT || process.env.PORT || '5000'
    }
  }
];

const writeWithPrefix = (name, stream, chunk) => {
  String(chunk)
    .split(/\r?\n/)
    .filter(Boolean)
    .forEach((line) => stream.write(`[${name}] ${line}\n`));
};

const startMicroservices = (services = serviceDefinitions) => {
  const children = [];
  let shuttingDown = false;

  const shutdown = (exitCode = 0) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    children.forEach((child) => {
      if (!child.killed) {
        child.kill();
      }
    });

    setTimeout(() => process.exit(exitCode), 300);
  };

  services.forEach(({ name, script, env }) => {
    const child = spawn(process.execPath, [path.join(backendRoot, script)], {
      cwd: backendRoot,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    children.push(child);

    child.stdout.on('data', (chunk) => writeWithPrefix(name, process.stdout, chunk));
    child.stderr.on('data', (chunk) => writeWithPrefix(name, process.stderr, chunk));
    child.on('exit', (code) => {
      if (!shuttingDown && code !== 0) {
        console.error(`[${name}] exited with code ${code}`);
        shutdown(code || 1);
      }
    });
  });

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  return { children, shutdown };
};

if (require.main === module) {
  startMicroservices();
}

module.exports = {
  serviceDefinitions,
  startMicroservices
};
