const axios = require('axios');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { getCorrelationId } = require('../middleware/correlationId');
const { normalizeServiceUrl } = require('../utils/serviceUrl');

const CATALOG_SERVICE_URL = normalizeServiceUrl(process.env.CATALOG_SERVICE_URL, 'http://localhost:5102');
const BOOKING_SERVICE_URL = normalizeServiceUrl(process.env.BOOKING_SERVICE_URL, 'http://localhost:5103');
const CHECKIN_SERVICE_URL = normalizeServiceUrl(process.env.CHECKIN_SERVICE_URL, 'http://localhost:5104');

const getInternalHeaders = () => {
  const headers = {};
  
  if (process.env.INTERNAL_API_KEY) {
    headers['x-internal-api-key'] = process.env.INTERNAL_API_KEY;
  }
  
  const correlationId = getCorrelationId();
  if (correlationId) {
    headers['x-correlation-id'] = correlationId;
  }
  
  return headers;
};

const requestInternal = async ({ baseUrl, path, method = 'get', data }) => {
  try {
    const response = await axios({
      method,
      url: `${baseUrl}${path}`,
      data,
      headers: getInternalHeaders()
    });

    return response.data.data;
  } catch (error) {
    const statusCode = error.response?.status || 502;
    const message = error.response?.data?.message || error.message || 'Internal service unavailable';
    throw new ApiError(statusCode, message);
  }
};

const getDashboardStats = async () => {
  const totalUsers = await User.countDocuments({ role: 'user' });
  const [catalogStats, bookingStats, checkinStats] = await Promise.all([
    requestInternal({
      baseUrl: CATALOG_SERVICE_URL,
      path: '/internal/catalog/stats'
    }),
    requestInternal({
      baseUrl: BOOKING_SERVICE_URL,
      path: '/internal/booking/stats'
    }),
    requestInternal({
      baseUrl: CHECKIN_SERVICE_URL,
      path: '/internal/checkin/stats'
    })
  ]);

  return {
    totalUsers,
    ...catalogStats,
    ...bookingStats,
    ...checkinStats
  };
};

const getAllBookings = async () => {
  return requestInternal({
    baseUrl: BOOKING_SERVICE_URL,
    path: '/internal/booking/bookings'
  });
};

const updatePaymentStatus = async (bookingId, paymentStatus) => {
  return requestInternal({
    baseUrl: BOOKING_SERVICE_URL,
    path: `/internal/booking/bookings/${bookingId}/payment`,
    method: 'put',
    data: { paymentStatus }
  });
};

const getAllUsers = async () => {
  // Exclude password and sensitive info
  return User.find({}).select('-password -__v -security').sort({ createdAt: -1 });
};

const updateUserRole = async (userId, role) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  
  if (!['user', 'admin', 'staff', 'organizer'].includes(role)) {
    throw new ApiError(400, 'Invalid role');
  }

  user.role = role;
  await user.save({ validateBeforeSave: false });
  return user;
};

module.exports = {
  getDashboardStats,
  getAllBookings,
  updatePaymentStatus,
  getAllUsers,
  updateUserRole
};
