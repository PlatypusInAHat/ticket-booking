const express = require('express');
const { ApiError, ApiResponse, asyncHandler } = require('@ticket-booking/shared');
const { authenticateToken } = require('../../../../middleware/auth');
const { buildUnsubscribeToken, updateEmailPreference } = require('../services/emailQueueService');
const EmailPreference = require('../models/EmailPreference');
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

const UNSUBSCRIBE_MESSAGE = 'You have been unsubscribed from marketing emails.';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

// Browsers following an email link (Accept: text/html first) get a tiny confirmation page;
// API clients (fetch/axios, Accept: application/json or */*) get JSON.
const sendUnsubscribeResult = (req, res, email) => {
  if (req.accepts(['json', 'html']) === 'html') {
    res.status(200).type('html').send(
      `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
      + `<title>Unsubscribed</title></head><body style="font-family:sans-serif;max-width:480px;margin:48px auto;padding:0 16px">`
      + `<h1>Unsubscribed</h1><p>${escapeHtml(email)} will no longer receive marketing emails.</p></body></html>`
    );
    return;
  }

  res.status(200).json(new ApiResponse(200, {
    email,
    unsubscribed: true,
    message: UNSUBSCRIBE_MESSAGE
  }, UNSUBSCRIBE_MESSAGE));
};

const toPreferencePayload = (email, preference = null) => ({
  email,
  transactionalEnabled: preference?.transactionalEnabled ?? true,
  eventReminderEnabled: preference?.eventReminderEnabled ?? true,
  marketingOptIn: preference?.marketingOptIn ?? false,
  locale: preference?.locale || 'en',
  unsubscribedAt: preference?.unsubscribedAt || null,
  updatedAt: preference?.updatedAt || null
});

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

router.post('/subscribe', asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new ApiError(400, 'A valid email is required');
  }

  const preference = await updateEmailPreference({
    email,
    marketingOptIn: true,
    unsubscribedAt: null,
    locale: req.body.locale === 'vi' ? 'vi' : 'en',
    metadata: {
      source: String(req.body.source || 'website').slice(0, 80),
      subscribedAt: new Date()
    }
  });

  res.status(200).json(new ApiResponse(200, {
    email: preference.email,
    marketingOptIn: preference.marketingOptIn
  }, 'Newsletter subscription saved'));
}));

router.get('/unsubscribe', asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.query.email);
  await unsubscribeEmail(email, req.query.token);
  sendUnsubscribeResult(req, res, email);
}));

router.post('/unsubscribe', asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email || req.query.email);
  await unsubscribeEmail(email, req.body.token || req.query.token);
  sendUnsubscribeResult(req, res, email);
}));

router.get('/preferences', authenticateToken, asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.user.email);

  if (!email) {
    throw new ApiError(400, 'Authenticated user email is required');
  }

  const preference = await EmailPreference.findOne({ email })
    .select('transactionalEnabled eventReminderEnabled marketingOptIn locale unsubscribedAt updatedAt')
    .lean();

  res.set('Cache-Control', 'private, no-store');
  res.status(200).json(new ApiResponse(200, toPreferencePayload(email, preference)));
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
