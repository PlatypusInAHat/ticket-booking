const axios = require('axios');
const ApiError = require('../../../shared/src/lib/ApiError');
const { normalizeServiceUrl } = require('./serviceUrl');

const circuitStates = new Map();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_TIMEOUT_MS = parsePositiveInt(process.env.INTERNAL_HTTP_TIMEOUT_MS, 5000);
const DEFAULT_RETRIES = parsePositiveInt(process.env.INTERNAL_HTTP_RETRIES, 2);
const DEFAULT_RETRY_DELAY_MS = parsePositiveInt(process.env.INTERNAL_HTTP_RETRY_DELAY_MS, 250);
const DEFAULT_CIRCUIT_BREAKER_THRESHOLD = parsePositiveInt(process.env.INTERNAL_HTTP_CIRCUIT_BREAKER_THRESHOLD, 5);
const DEFAULT_CIRCUIT_BREAKER_COOLDOWN_MS = parsePositiveInt(process.env.INTERNAL_HTTP_CIRCUIT_BREAKER_COOLDOWN_MS, 15000);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getCircuitState = (serviceKey) => {
  if (!circuitStates.has(serviceKey)) {
    circuitStates.set(serviceKey, {
      state: 'closed',
      failures: 0,
      openedAt: 0
    });
  }

  return circuitStates.get(serviceKey);
};

const isTransientError = (error) => {
  const status = error.response?.status;
  const code = error.code || '';

  return (
    status === 429 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    code === 'ECONNABORTED' ||
    code === 'ECONNRESET' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT'
  );
};

const assertCircuitAllowsRequest = (state, options) => {
  if (state.state !== 'open') {
    return;
  }

  const cooldownMs = options.circuitBreakerCooldownMs ?? DEFAULT_CIRCUIT_BREAKER_COOLDOWN_MS;
  const isCooldownElapsed = Date.now() - state.openedAt >= cooldownMs;

  if (!isCooldownElapsed) {
    throw new ApiError(503, `${options.serviceName} circuit breaker is open`);
  }

  state.state = 'half-open';
};

const markCircuitSuccess = (state) => {
  state.state = 'closed';
  state.failures = 0;
  state.openedAt = 0;
};

const markCircuitFailure = (state, options) => {
  state.failures += 1;
  const threshold = options.circuitBreakerThreshold ?? DEFAULT_CIRCUIT_BREAKER_THRESHOLD;

  if (state.failures >= threshold) {
    state.state = 'open';
    state.openedAt = Date.now();
  }
};

const toApiError = (error, serviceName) => {
  if (error instanceof ApiError) {
    return error;
  }

  const statusCode = error.response?.status || 502;
  const message = error.response?.data?.message || error.message || `${serviceName} unavailable`;
  return new ApiError(statusCode, message);
};

const createInternalHttpRequester = ({ getCorrelationId } = {}) => {
  const buildHeaders = (headers = {}) => {
    const normalizedHeaders = { ...headers };

    if (process.env.INTERNAL_API_KEY) {
      normalizedHeaders['x-internal-api-key'] = process.env.INTERNAL_API_KEY;
    }

    const correlationId = typeof getCorrelationId === 'function' ? getCorrelationId() : '';
    if (correlationId) {
      normalizedHeaders['x-correlation-id'] = correlationId;
    }

    return normalizedHeaders;
  };

  return async ({
    serviceName,
    baseUrl,
    path,
    method = 'get',
    data,
    params,
    headers,
    timeoutMs,
    retries,
    retryDelayMs,
    responseType,
    validateStatus,
    rawResponse = false,
    circuitBreakerThreshold,
    circuitBreakerCooldownMs
  }) => {
    const normalizedBaseUrl = normalizeServiceUrl(baseUrl, baseUrl);
    const serviceKey = `${serviceName}:${normalizedBaseUrl}`;
    const state = getCircuitState(serviceKey);
    const requestOptions = {
      serviceName,
      circuitBreakerThreshold,
      circuitBreakerCooldownMs
    };

    assertCircuitAllowsRequest(state, requestOptions);

    const maxRetries = retries ?? DEFAULT_RETRIES;
    const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const backoffMs = retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const response = await axios({
          method,
          url: `${normalizedBaseUrl}${path}`,
          data,
          params,
          headers: buildHeaders(headers),
          timeout,
          responseType,
          validateStatus
        });

        markCircuitSuccess(state);
        return rawResponse ? response : response.data?.data;
      } catch (error) {
        lastError = error;

        if (!isTransientError(error) || attempt === maxRetries) {
          break;
        }

        await wait(backoffMs * (attempt + 1));
      }
    }

    if (isTransientError(lastError) || !lastError?.response) {
      markCircuitFailure(state, requestOptions);
    }

    throw toApiError(lastError, serviceName);
  };
};

module.exports = {
  createInternalHttpRequester
};
