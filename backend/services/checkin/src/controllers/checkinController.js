const checkinService = require('../services/checkinService');
const { asyncHandler, ApiResponse } = require('@ticket-booking/shared');

const buildRequestContext = (req) => ({
  ip: req.ip || '',
  userAgent: req.get('user-agent') || ''
});

const validatePass = asyncHandler(async (req, res) => {
  const { code, scanToken, nfcPayload, method, gate, deviceId } = req.body;
  const data = await checkinService.validatePass(code || scanToken || nfcPayload, req.user, {
    ...buildRequestContext(req),
    method,
    gate,
    deviceId
  });
  res.status(200).json(new ApiResponse(200, data));
});

const checkInPass = asyncHandler(async (req, res) => {
  const { code, scanToken, nfcPayload, method, gate, deviceId, appVersion } = req.body;
  const data = await checkinService.checkInPass({
    scanInput: code || scanToken || nfcPayload,
    method,
    gate,
    deviceId,
    appVersion,
    request: buildRequestContext(req)
  }, req.user);
  res.status(200).json(new ApiResponse(200, data, 'Check-in successful'));
});

const getCheckInStats = asyncHandler(async (req, res) => {
  const data = await checkinService.getCheckInStats(req.query.ticketId);
  res.status(200).json(new ApiResponse(200, data));
});

module.exports = {
  checkInPass,
  getCheckInStats,
  validatePass
};
