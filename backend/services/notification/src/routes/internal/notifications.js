const express = require('express');
const EmailJob = require('../../models/EmailJob');
const EmailLog = require('../../models/EmailLog');
const EmailPreference = require('../../models/EmailPreference');
const EmailSuppression = require('../../models/EmailSuppression');
const internalAuth = require('../../../../../shared/internalAuth');
const asyncHandler = require('../../../../../utils/asyncHandler');
const ApiResponse = require('../../../../../utils/ApiResponse');
const ApiError = require('../../../../../utils/ApiError');
const {
  createMarketingCampaign,
  enqueueEmail,
  suppressEmail,
  updateEmailPreference
} = require('../../services/emailQueueService');

const router = express.Router();

router.use(internalAuth);

router.get('/stats', asyncHandler(async (req, res) => {
  const [
    queued,
    processing,
    sent,
    failed,
    skipped,
    suppressed,
    preferences
  ] = await Promise.all([
    EmailJob.countDocuments({ status: 'queued' }),
    EmailJob.countDocuments({ status: 'processing' }),
    EmailJob.countDocuments({ status: 'sent' }),
    EmailJob.countDocuments({ status: 'failed' }),
    EmailJob.countDocuments({ status: 'skipped' }),
    EmailSuppression.countDocuments(),
    EmailPreference.countDocuments()
  ]);

  res.status(200).json(new ApiResponse(200, {
    queued,
    processing,
    sent,
    failed,
    skipped,
    suppressed,
    preferences
  }));
}));

router.get('/jobs', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 100);
  const status = req.query.status ? { status: req.query.status } : {};
  const jobs = await EmailJob.find(status).sort({ createdAt: -1 }).limit(limit).lean();
  res.status(200).json(new ApiResponse(200, jobs));
}));

router.get('/logs', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 100);
  const logs = await EmailLog.find().sort({ createdAt: -1 }).limit(limit).lean();
  res.status(200).json(new ApiResponse(200, logs));
}));

router.post('/emails', asyncHandler(async (req, res) => {
  const { to, type, category, subject, template, context, scheduledAt, priority, idempotencyKey } = req.body;

  if (!to || !category || !subject || !template) {
    throw new ApiError(400, 'to, category, subject, and template are required');
  }

  const job = await enqueueEmail({
    to,
    type,
    category,
    subject,
    template,
    context,
    scheduledAt,
    priority,
    idempotencyKey,
    sourceEvent: 'internal.notification_request'
  });

  res.status(201).json(new ApiResponse(201, job));
}));

router.put('/preferences', asyncHandler(async (req, res) => {
  if (!req.body.email) {
    throw new ApiError(400, 'email is required');
  }

  const preference = await updateEmailPreference(req.body);
  res.status(200).json(new ApiResponse(200, preference));
}));

router.post('/suppressions', asyncHandler(async (req, res) => {
  if (!req.body.email) {
    throw new ApiError(400, 'email is required');
  }

  const suppression = await suppressEmail(req.body);
  res.status(201).json(new ApiResponse(201, suppression));
}));

router.post('/marketing-campaigns', asyncHandler(async (req, res) => {
  const { name, subject, recipients } = req.body;

  if (!name || !subject || !Array.isArray(recipients)) {
    throw new ApiError(400, 'name, subject, and recipients[] are required');
  }

  const campaign = await createMarketingCampaign(req.body);
  res.status(201).json(new ApiResponse(201, campaign));
}));

module.exports = router;
