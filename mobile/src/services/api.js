import { API_BASE_URL } from '../config';

let token = null;

export const setAuthToken = (nextToken) => {
  token = nextToken;
};

export const getAuthToken = () => token;

export const getAuthHeaders = () => (
  token ? { Authorization: `Bearer ${token}` } : {}
);

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });

  const value = query.toString();
  return value ? `?${value}` : '';
};

const request = async (path, options = {}) => {
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...getAuthHeaders(),
    ...options.headers
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(payload?.message || 'Không thể kết nối máy chủ.');
  }

  return payload?.data ?? payload;
};

export const imageUrl = (path) => `${API_BASE_URL}${path}`;

export const authApi = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (data) => request('/auth/register', { method: 'POST', body: data })
};

export const ticketApi = {
  list: (params) => request(`/tickets${buildQuery(params)}`),
  detail: (id) => request(`/tickets/${id}`)
};

export const bookingApi = {
  create: (data) => request('/bookings', { method: 'POST', body: data }),
  list: () => request('/bookings'),
  detail: (id) => request(`/bookings/${id}`),
  cancel: (id) => request(`/bookings/${id}/cancel`, { method: 'PUT' }),
  passes: (bookingId) => request(`/bookings/${bookingId}/passes`),
  passDetail: (bookingId, passId) => request(`/bookings/${bookingId}/passes/${passId}`),
  nfcPayload: (bookingId, passId) => request(`/bookings/${bookingId}/passes/${passId}/nfc-payload`)
};

export const paymentApi = {
  process: (data) => request('/payment/process', { method: 'POST', body: data })
};

export const userApi = {
  profile: () => request('/users/profile'),
  updateProfile: (data) => request('/users/profile', { method: 'PUT', body: data })
};

export const checkinApi = {
  validate: (data) => request('/checkin/validate', { method: 'POST', body: data }),
  checkIn: (data) => request('/checkin', { method: 'POST', body: data }),
  stats: () => request('/checkin/stats')
};
