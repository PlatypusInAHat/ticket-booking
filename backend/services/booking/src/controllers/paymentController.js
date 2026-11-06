const paymentService = require('../services/paymentService');
const { asyncHandler, ApiResponse } = require('@ticket-booking/shared');

const createPaymentSession = asyncHandler(async (req, res) => {
  const { bookingId, provider } = req.body;
  const data = await paymentService.createPaymentSession(bookingId, provider, req.user, req);
  res.status(201).json(new ApiResponse(201, data, 'Payment session created successfully'));
});

const processPayment = asyncHandler(async (req, res) => {
  const { bookingId, paymentToken } = req.body;
  const data = await paymentService.processPayment(bookingId, paymentToken, req.user);
  res.status(200).json(new ApiResponse(200, data, 'Payment processed successfully'));
});

const getPaymentStatus = asyncHandler(async (req, res) => {
  const data = await paymentService.getPaymentStatus(req.params.bookingId, req.user);
  res.status(200).json(new ApiResponse(200, data));
});

const handleMomoWebhook = asyncHandler(async (req, res) => {
  await paymentService.handleMomoWebhook(req.body);
  res.status(204).send();
});

const handleVnpayWebhook = asyncHandler(async (req, res) => {
  const data = await paymentService.handleVnpayResult(req.query);
  res.status(200).json(data);
});

const handleVnpayReturn = asyncHandler(async (req, res) => {
  const data = await paymentService.handleVnpayResult(req.query);
  res.status(200).json(new ApiResponse(200, data));
});

module.exports = {
  createPaymentSession,
  handleMomoWebhook,
  handleVnpayReturn,
  handleVnpayWebhook,
  processPayment,
  getPaymentStatus
};
