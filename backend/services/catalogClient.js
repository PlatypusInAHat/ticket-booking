const axios = require('axios');
const ApiError = require('../utils/ApiError');

const getCatalogBaseUrl = () => {
  return process.env.CATALOG_SERVICE_URL || 'http://localhost:5102';
};

const requestCatalog = async (path, body = {}) => {
  try {
    const response = await axios.post(`${getCatalogBaseUrl()}${path}`, body, {
      headers: process.env.INTERNAL_API_KEY
        ? { 'x-internal-api-key': process.env.INTERNAL_API_KEY }
        : undefined
    });

    return response.data.data;
  } catch (error) {
    const statusCode = error.response?.status || 502;
    const message = error.response?.data?.message || error.message || 'Catalog service unavailable';
    throw new ApiError(statusCode, message);
  }
};

const reserveTickets = async (tickets) => {
  return requestCatalog('/internal/catalog/tickets/reserve', { tickets });
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
