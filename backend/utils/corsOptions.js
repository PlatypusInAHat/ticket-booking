const parseOrigins = (value = '') =>
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const getAllowedOrigins = () => {
  const configuredOrigins = [
    ...parseOrigins(process.env.FRONTEND_URLS),
    ...parseOrigins(process.env.FRONTEND_URL)
  ];

  if (process.env.NODE_ENV !== 'production') {
    configuredOrigins.push(
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    );
  }

  return [...new Set(configuredOrigins)];
};

const createCorsOptions = () => {
  const allowedOrigins = getAllowedOrigins();

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    }
  };
};

module.exports = {
  createCorsOptions,
  getAllowedOrigins
};
