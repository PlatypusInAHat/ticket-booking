const express = require('express');
const CheckInDevice = require('../../models/CheckInDevice');
const CheckInLog = require('../../models/CheckInLog');
const internalAuth = require('../../../../../shared/internalAuth');
const asyncHandler = require('../../../../../utils/asyncHandler');
const ApiResponse = require('../../../../../utils/ApiResponse');

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
