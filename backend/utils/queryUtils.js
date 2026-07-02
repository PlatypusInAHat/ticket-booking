const parsePositiveInt = (value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return fallback;
  }

  return parsed;
};

const parseBoolean = (value) => {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return undefined;
};

const parseDate = (value) => {
  if (!value) return undefined;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const normalizeSortOrder = (value, fallback = 'desc') => {
  return String(value).toLowerCase() === 'asc' ? 1 : fallback === 'asc' ? 1 : -1;
};

const buildSort = (sortBy, order, allowedFields, fallbackField) => {
  const field = allowedFields.includes(sortBy) ? sortBy : fallbackField;
  return { [field]: normalizeSortOrder(order) };
};

const escapeRegex = (value = '') => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
  escapeRegex,
  buildSort,
  normalizeSortOrder,
  parseBoolean,
  parseDate,
  parsePositiveInt
};
