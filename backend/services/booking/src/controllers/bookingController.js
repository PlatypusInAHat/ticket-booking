const bookingService = require('../services/bookingService');
const { enqueueBookingCreation, getPurchaseQueueStats } = require('../services/purchaseQueue');
const asyncHandler = require('../../../../utils/asyncHandler');
const ApiResponse = require('../../../../utils/ApiResponse');

const createBooking = asyncHandler(async (req, res) => {
  const booking = await enqueueBookingCreation(() => bookingService.createBooking(req.body, req.user, {
    botProtection: req.botProtection
  }));
  res.status(201).json(new ApiResponse(201, booking, 'Booking created successfully'));
});

const getQueueStatus = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, await getPurchaseQueueStats()));
});

const getUserBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.getUserBookings(req.user.id, req.query);
  res.status(200).json(new ApiResponse(200, bookings));
});

const getBookingById = asyncHandler(async (req, res) => {
  const booking = await bookingService.getBookingById(req.params.id, req.user);
  res.status(200).json(new ApiResponse(200, booking));
});

const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.cancelBooking(req.params.id, req.user);
  res.status(200).json(new ApiResponse(200, booking, 'Booking cancelled successfully'));
});

module.exports = {
  createBooking,
  getQueueStatus,
  getUserBookings,
  getBookingById,
  cancelBooking
};
