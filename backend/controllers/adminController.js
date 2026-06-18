const adminService = require('../services/adminService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  res.status(200).json(new ApiResponse(200, stats));
});

const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await adminService.getAllBookings();
  res.status(200).json(new ApiResponse(200, bookings));
});

const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;
  const booking = await adminService.updatePaymentStatus(req.params.id, paymentStatus);
  res.status(200).json(new ApiResponse(200, booking, 'Payment status updated'));
});

module.exports = {
  getDashboardStats,
  getAllBookings,
  updatePaymentStatus
};
