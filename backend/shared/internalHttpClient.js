const { getCorrelationId } = require('../middleware/correlationId');
const { createInternalHttpRequester } = require('@ticket-booking/platform');

const requestInternalService = createInternalHttpRequester({ getCorrelationId });

module.exports = {
  requestInternalService
};
