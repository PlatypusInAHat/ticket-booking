const dotenv = require('dotenv');
const connectDB = require('../config/db');

dotenv.config();

const startHttpService = async ({
  app,
  serviceName,
  port,
  connectDatabase = true,
  mongoUri = process.env.MONGODB_URI
}) => {
  if (process.env.NODE_ENV === 'test') {
    return app;
  }

  if (connectDatabase) {
    await connectDB(mongoUri);
  }

  app.listen(port, () => {
    console.log(`[${serviceName}] running on port ${port} (${process.env.NODE_ENV || 'development'})`);
  });
};

module.exports = startHttpService;
