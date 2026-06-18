const mongoose = require('mongoose');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const connectDB = async (mongoUri = process.env.MONGODB_URI, options = {}) => {
  if (!mongoUri) {
    console.error('[db] connection failed: MongoDB URI is not configured');
    process.exit(1);
  }

  const retries = Math.max(1, Number.parseInt(process.env.MONGODB_CONNECT_RETRIES || '10', 10));
  const retryDelayMs = Math.max(250, Number.parseInt(process.env.MONGODB_CONNECT_RETRY_DELAY_MS || '2000', 10));

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: retryDelayMs,
        ...options
      });

      console.log(`[db] connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (error) {
      console.error(`[db] connection attempt ${attempt}/${retries} failed:`, error.message);

      if (attempt === retries) {
        process.exit(1);
      }

      await wait(retryDelayMs);
    }
  }
};

module.exports = connectDB;
