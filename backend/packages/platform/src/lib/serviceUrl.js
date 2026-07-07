const URL_PROTOCOL_PATTERN = /^[a-z][a-z\d+\-.]*:\/\//i;

const stripTrailingSlashes = (value) => String(value || '').trim().replace(/\/+$/, '');

const normalizeServiceUrl = (value, fallback, options = {}) => {
  const defaultProtocol = options.defaultProtocol || 'http';
  const rawUrl = stripTrailingSlashes(value || fallback);

  if (!rawUrl) {
    return '';
  }

  if (URL_PROTOCOL_PATTERN.test(rawUrl)) {
    return rawUrl;
  }

  return `${defaultProtocol}://${rawUrl}`;
};

module.exports = {
  normalizeServiceUrl
};
