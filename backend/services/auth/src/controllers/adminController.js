const adminService = require('../services/adminService');
const asyncHandler = require('../../../../utils/asyncHandler');
const ApiResponse = require('../../../../utils/ApiResponse');

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

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await adminService.getAllUsers();
  res.status(200).json(new ApiResponse(200, users, 'Users retrieved successfully'));
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const user = await adminService.updateUserRole(req.params.id, role);
  res.status(200).json(new ApiResponse(200, user, 'User role updated successfully'));
});

module.exports = {
  getDashboardStats,
  getAllBookings,
  updatePaymentStatus,
  getAllUsers,
  updateUserRole
};
