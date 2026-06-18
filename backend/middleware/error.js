const ApiError = require('../utils/ApiError');

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const isMongooseError = error instanceof require('mongoose').Error;
    const statusCode = error.statusCode || (isMongooseError ? 400 : 500);
    const message = error.message || 'Something went wrong';
    error = new ApiError(statusCode, message, false, err.stack);
  }

  const response = {
    success: false,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };

  res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
