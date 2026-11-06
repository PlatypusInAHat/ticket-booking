const passService = require('../services/passService');
const { asyncHandler, ApiResponse } = require('@ticket-booking/shared');

const getBookingPasses = asyncHandler(async (req, res) => {
  const data = await passService.getBookingPasses(req.params.id, req.user);
  res.status(200).json(new ApiResponse(200, data));
});

const getPassDetail = asyncHandler(async (req, res) => {
  const data = await passService.getPassDetail(req.params.id, req.params.passId, req.user);
  res.status(200).json(new ApiResponse(200, data));
});

const getPassQrImage = asyncHandler(async (req, res) => {
  const buffer = await passService.getPassQrImage(req.params.id, req.params.passId, req.user);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.status(200).send(buffer);
});

const getPassBarcodeImage = asyncHandler(async (req, res) => {
  const buffer = await passService.getPassBarcodeImage(req.params.id, req.params.passId, req.user);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'private, max-age=60');
  res.status(200).send(buffer);
});

const getPassNfcPayload = asyncHandler(async (req, res) => {
  const data = await passService.getPassNfcPayload(req.params.id, req.params.passId, req.user);
  res.status(200).json(new ApiResponse(200, data));
});

module.exports = {
  getBookingPasses,
  getPassBarcodeImage,
  getPassDetail,
  getPassNfcPayload,
  getPassQrImage
};
