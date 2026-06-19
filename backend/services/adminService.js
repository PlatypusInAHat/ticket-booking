const axios = require('axios');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const getInternalHeaders = () => {
  return process.env.INTERNAL_API_KEY
    ? { 'x-internal-api-key': process.env.INTERNAL_API_KEY }
    : {};
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
      baseUrl: process.env.CATALOG_SERVICE_URL || 'http://localhost:5102',
      path: '/internal/catalog/stats'
    }),
    requestInternal({
      baseUrl: process.env.BOOKING_SERVICE_URL || 'http://localhost:5103',
      path: '/internal/booking/stats'
    }),
    requestInternal({
      baseUrl: process.env.CHECKIN_SERVICE_URL || 'http://localhost:5104',
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
    baseUrl: process.env.BOOKING_SERVICE_URL || 'http://localhost:5103',
    path: '/internal/booking/bookings'
  });
};

const updatePaymentStatus = async (bookingId, paymentStatus) => {
  return requestInternal({
    baseUrl: process.env.BOOKING_SERVICE_URL || 'http://localhost:5103',
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
