const crypto = require('crypto');
const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

const correlationIdMiddleware = (req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  
  asyncLocalStorage.run(new Map([['correlationId', correlationId]]), () => {
    next();
  });
};

const getCorrelationId = () => {
  const store = asyncLocalStorage.getStore();
  return store ? store.get('correlationId') : null;
};

module.exports = {
  correlationIdMiddleware,
  getCorrelationId
};
