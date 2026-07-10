const { ApiError } = require('@ticket-booking/shared');
const { createInternalHttpRequester, serviceUrl } = require('@ticket-booking/platform');

const requestInternalService = createInternalHttpRequester();
const { normalizeServiceUrl } = serviceUrl;

const getCatalogBaseUrl = () => {
  return normalizeServiceUrl(process.env.CATALOG_SERVICE_URL, 'http://localhost:5102');
};

const requestCatalog = async (path, body = {}) => {
  try {
    return await requestInternalService({
      serviceName: 'catalog-service',
      baseUrl: getCatalogBaseUrl(),
      path,
      method: 'post',
      data: body
    });
  } catch (error) {
    const statusCode = error.response?.status || 502;
    const message = error.response?.data?.message || error.message || 'Catalog service unavailable';
    throw new ApiError(statusCode, message);
  }
};

const reserveTickets = async (tickets, options = {}) => {
  return requestCatalog('/internal/catalog/tickets/reserve', {
    tickets,
    userId: options.userId,
    expiresAt: options.expiresAt
  });
};

const releaseTickets = async (tickets, options = {}) => {
  return requestCatalog('/internal/catalog/tickets/release', {
    tickets,
    restoreRevenue: Boolean(options.restoreRevenue)
  });
};

const applyRevenue = async (tickets) => {
  return requestCatalog('/internal/catalog/events/revenue', { tickets });
};

module.exports = {
  applyRevenue,
  releaseTickets,
  reserveTickets
};
