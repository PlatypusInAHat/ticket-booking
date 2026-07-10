const express = require('express');
const { ApiError, ApiResponse, asyncHandler } = require('@ticket-booking/shared');
const { authenticateToken } = require('../../../../middleware/auth');
const { buildUnsubscribeToken, updateEmailPreference } = require('../services/emailQueueService');
const { cryptoUtils } = require('@ticket-booking/platform');
const { constantTimeEqual } = cryptoUtils;

const router = express.Router();

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const verifyUnsubscribeToken = (email, token = '') => {
  if (token && constantTimeEqual(token, buildUnsubscribeToken(email))) {
    return true;
  }

  return process.env.ALLOW_UNSIGNED_UNSUBSCRIBE === 'true' || process.env.NODE_ENV !== 'production';
};

const unsubscribeEmail = async (email, token) => {
  if (!email) {
    throw new ApiError(400, 'email is required');
  }

  if (!verifyUnsubscribeToken(email, token)) {
    throw new ApiError(400, 'Invalid unsubscribe token');
  }

  await updateEmailPreference({
    email,
    marketingOptIn: false,
    unsubscribedAt: new Date()
  });
};

router.get('/unsubscribe', asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.query.email);
  await unsubscribeEmail(email, req.query.token);

  res.status(200).json(new ApiResponse(200, {
    message: 'You have been unsubscribed from marketing emails.'
  }));
}));

router.post('/unsubscribe', asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  await unsubscribeEmail(email, req.body.token);

  res.status(200).json(new ApiResponse(200, {
    message: 'You have been unsubscribed from marketing emails.'
  }));
}));

router.put('/preferences', authenticateToken, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.user.email);

  if (!email) {
    throw new ApiError(400, 'Authenticated user email is required');
  }

  const allowedUpdates = {
    transactionalEnabled: req.body.transactionalEnabled,
    eventReminderEnabled: req.body.eventReminderEnabled,
    marketingOptIn: req.body.marketingOptIn,
    locale: req.body.locale
  };

  Object.keys(allowedUpdates).forEach((key) => {
    if (allowedUpdates[key] === undefined) {
      delete allowedUpdates[key];
    }
  });

  if (allowedUpdates.marketingOptIn === true) {
    allowedUpdates.unsubscribedAt = null;
  }

  const preference = await updateEmailPreference({
    email,
    user: req.user.id,
    ...allowedUpdates
  });

  res.status(200).json(new ApiResponse(200, preference));
}));

module.exports = router;
