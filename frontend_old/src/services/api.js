import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data)
};

// Events API
export const eventsAPI = {
  getEvents: (params, config = {}) => API.get('/events', { params, ...config }),
  getEventById: (id, config = {}) => API.get(`/events/${id}`, config)
};

// Tickets API
export const ticketsAPI = {
  getAll: (params, config = {}) => API.get('/tickets', { params, ...config }),
  getById: (id, config = {}) => API.get(`/tickets/${id}`, config),
  create: (data) => API.post('/tickets', data),
  update: (id, data) => API.put(`/tickets/${id}`, data),
  delete: (id) => API.delete(`/tickets/${id}`)
};

// Bookings API
export const bookingsAPI = {
  create: (data) => API.post('/bookings', data),
  getAll: () => API.get('/bookings'),
  getById: (id) => API.get(`/bookings/${id}`),
  cancel: (id) => API.put(`/bookings/${id}/cancel`)
};

// Users API
export const usersAPI = {
  getProfile: () => API.get('/users/profile'),
  updateProfile: (data) => API.put('/users/profile', data)
};

// Payment API
export const paymentAPI = {
  createSession: (data) => API.post('/payment/session', data),
  processPayment: (data) => API.post('/payment/process', data),
  getPaymentStatus: (bookingId) => API.get(`/payment/${bookingId}`)
};

// Admin API
export const adminAPI = {
  getStats: () => API.get('/admin/stats'),
  getBookings: () => API.get('/admin/bookings'),
  updatePaymentStatus: (bookingId, status) =>
    API.put(`/admin/bookings/${bookingId}/payment`, { paymentStatus: status })
};

export default API;
