const express = require('express');
const CheckInDevice = require('../../models/CheckInDevice');
const CheckInLog = require('../../models/CheckInLog');
const { ApiResponse, asyncHandler } = require('@ticket-booking/shared');
const { internalAuth } = require('@ticket-booking/platform');

const router = express.Router();

router.use(internalAuth);

router.get('/stats', asyncHandler(async (req, res) => {
  const [totalCheckIns, activeCheckInDevices] = await Promise.all([
    CheckInLog.countDocuments({ result: 'success' }),
    CheckInDevice.countDocuments({ status: 'active' })
  ]);

  res.status(200).json(new ApiResponse(200, {
    totalCheckIns,
    activeCheckInDevices
  }));
}));

module.exports = router;
