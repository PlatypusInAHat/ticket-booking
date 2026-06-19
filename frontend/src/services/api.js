import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Add token to requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for refresh token
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/refresh-token')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return API(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        // Optionally, dispatch logout here if we had access to store
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API.defaults.baseURL}/auth/refresh-token`, { refreshToken });
        
        const newAccessToken = data.data.token;
        const newRefreshToken = data.data.refreshToken;
        
        localStorage.setItem('token', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        if (data.data.user) {
          localStorage.setItem('auth_user', JSON.stringify(data.data.user));
        }

        API.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        
        return API(originalRequest);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
  getProfile: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/updatedetails', data),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => API.put(`/auth/reset-password/${token}`, { password })
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
    API.put(`/admin/bookings/${bookingId}/payment`, { paymentStatus: status }),
  getGatewayStatus: () => API.get('/admin/gateway/status'),
  getUsers: () => API.get('/admin/users'),
  updateUserRole: (userId, role) => API.put(`/admin/users/${userId}/role`, { role })
};

export const uploadAPI = {
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return API.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};

export default API;
