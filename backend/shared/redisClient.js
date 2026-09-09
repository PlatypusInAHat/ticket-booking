const { createClient } = require('redis');

let client;
let connecting;

const getRedisClient = async () => {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL is required when a Redis-backed store is enabled');
  }

  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (error) => {
      console.error('[redis] client error:', error.message);
    });
  }

  if (!client.isOpen) {
    connecting ||= client.connect();
    try {
      await connecting;
    } finally {
      connecting = null;
    }
  }

  return client;
};

const closeRedisClient = async () => {
  if (client?.isOpen) {
    await client.quit();
  }
  client = null;
  connecting = null;
};

module.exports = { closeRedisClient, getRedisClient };
