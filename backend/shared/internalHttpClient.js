const { getCorrelationId } = require('../middleware/correlationId');
const { createInternalHttpRequester } = require('../packages/platform/src/lib/internalHttpClient');

const requestInternalService = createInternalHttpRequester({ getCorrelationId });

module.exports = {
  requestInternalService
};
