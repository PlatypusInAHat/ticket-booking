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
      AUTH_MONGODB_URI: process.env.AUTH_MONGODB_URI || 'mongodb://127.0.0.1:27017/ticket-auth',
      CATALOG_SERVICE_URL: process.env.CATALOG_SERVICE_URL || 'http://127.0.0.1:5102',
      BOOKING_SERVICE_URL: process.env.BOOKING_SERVICE_URL || 'http://127.0.0.1:5103',
      CHECKIN_SERVICE_URL: process.env.CHECKIN_SERVICE_URL || 'http://127.0.0.1:5104',
      EVENT_BROKER_URL: process.env.EVENT_BROKER_URL,
      EVENT_EXCHANGE: process.env.EVENT_EXCHANGE
    }
  },
  {
    name: 'catalog-service',
    script: 'microservices/catalog-service/server.js',
    env: {
      SERVICE_MODE: 'microservice',
      SERVICE_NAME: 'catalog-service',
      CATALOG_SERVICE_PORT: process.env.CATALOG_SERVICE_PORT || '5102',
      CATALOG_MONGODB_URI: process.env.CATALOG_MONGODB_URI || 'mongodb://127.0.0.1:27017/ticket-catalog'
    }
  },
  {
    name: 'booking-service',
    script: 'microservices/booking-service/server.js',
    env: {
      SERVICE_MODE: 'microservice',
      SERVICE_NAME: 'booking-service',
      BOOKING_SERVICE_PORT: process.env.BOOKING_SERVICE_PORT || '5103',
      BOOKING_MONGODB_URI: process.env.BOOKING_MONGODB_URI || 'mongodb://127.0.0.1:27017/ticket-booking',
      CATALOG_SERVICE_URL: process.env.CATALOG_SERVICE_URL || 'http://127.0.0.1:5102',
      EVENT_REMINDER_WORKER_ENABLED: process.env.EVENT_REMINDER_WORKER_ENABLED,
      EVENT_REMINDER_INTERVAL_MS: process.env.EVENT_REMINDER_INTERVAL_MS,
      EVENT_REMINDER_WINDOW_HOURS: process.env.EVENT_REMINDER_WINDOW_HOURS,
      EVENT_REMINDER_BATCH_SIZE: process.env.EVENT_REMINDER_BATCH_SIZE
    }
  },
  {
    name: 'checkin-service',
    script: 'microservices/checkin-service/server.js',
    env: {
      SERVICE_MODE: 'microservice',
      SERVICE_NAME: 'checkin-service',
      CHECKIN_SERVICE_PORT: process.env.CHECKIN_SERVICE_PORT || '5104',
      CHECKIN_MONGODB_URI: process.env.CHECKIN_MONGODB_URI || 'mongodb://127.0.0.1:27017/ticket-checkin'
    }
  },
  {
    name: 'api-gateway',
    script: 'microservices/api-gateway/server.js',
    env: {
      SERVICE_MODE: 'microservice',
      SERVICE_NAME: 'api-gateway',
      GATEWAY_PORT: process.env.GATEWAY_PORT || process.env.PORT || '5000',
      NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || 'http://127.0.0.1:5105'
    }
  },
  {
    name: 'notification-service',
    script: 'microservices/notification-service/server.js',
    env: {
      SERVICE_MODE: 'microservice',
      SERVICE_NAME: 'notification-service',
      NOTIFICATION_SERVICE_PORT: process.env.NOTIFICATION_SERVICE_PORT || '5105',
      NOTIFICATION_MONGODB_URI: process.env.NOTIFICATION_MONGODB_URI || 'mongodb://127.0.0.1:27017/ticket-notification',
      EVENT_BROKER_URL: process.env.EVENT_BROKER_URL,
      EVENT_EXCHANGE: process.env.EVENT_EXCHANGE,
      INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
      SECRET_HASH_KEY: process.env.SECRET_HASH_KEY,
      JWT_SECRET: process.env.JWT_SECRET,
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
      PUBLIC_API_URL: process.env.PUBLIC_API_URL || 'http://localhost:5000',
      EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
      EMAIL_FROM: process.env.EMAIL_FROM,
      EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
      EMAIL_HOST: process.env.EMAIL_HOST,
      EMAIL_PORT: process.env.EMAIL_PORT,
      EMAIL_SECURE: process.env.EMAIL_SECURE,
      EMAIL_USER: process.env.EMAIL_USER,
      EMAIL_PASS: process.env.EMAIL_PASS,
      SES_SMTP_HOST: process.env.SES_SMTP_HOST,
      SES_SMTP_PORT: process.env.SES_SMTP_PORT,
      SES_SMTP_USERNAME: process.env.SES_SMTP_USERNAME,
      SES_SMTP_PASSWORD: process.env.SES_SMTP_PASSWORD,
      EMAIL_WORKER_ENABLED: process.env.EMAIL_WORKER_ENABLED,
      EMAIL_WORKER_INTERVAL_MS: process.env.EMAIL_WORKER_INTERVAL_MS,
      EMAIL_WORKER_BATCH_SIZE: process.env.EMAIL_WORKER_BATCH_SIZE
    }
  }
];

const writeWithPrefix = (name, stream, chunk) => {
  String(chunk)
    .split(/\r?\n/)
    .filter(Boolean)
    .forEach((line) => stream.write(`[${name}] ${line}\n`));
};

const removeUndefinedEnvValues = (env = {}) => {
  return Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined)
  );
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
      env: removeUndefinedEnvValues({ ...process.env, ...env }),
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
