const EmailJob = require('../models/EmailJob');
const EmailLog = require('../models/EmailLog');
const EmailPreference = require('../models/EmailPreference');
const EmailSuppression = require('../models/EmailSuppression');
const MarketingCampaign = require('../models/MarketingCampaign');
const { sendEmail } = require('../../../../utils/emailService');
const logger = require('../../../../utils/logger');
const { hmacSha256 } = require('../../../../utils/cryptoUtils');

const DEFAULT_WORKER_INTERVAL_MS = 5000;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_LOCK_MS = 60000;
const DEFAULT_MAX_ATTEMPTS = 3;

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();

const buildUnsubscribeToken = (email) => hmacSha256(normalizeEmail(email), 'email-unsubscribe');

const getRetryDelayMs = (attempts) => {
  const baseDelayMs = Number(process.env.EMAIL_RETRY_BASE_DELAY_MS || 30000);
  const delay = baseDelayMs * Math.max(1, 2 ** Math.max(0, attempts - 1));
  return Math.min(delay, Number(process.env.EMAIL_RETRY_MAX_DELAY_MS || 15 * 60 * 1000));
};

const shouldSkipByPreference = async ({ to, type }) => {
  const preference = await EmailPreference.findOne({ email: normalizeEmail(to) }).lean();

  if (!preference) {
    return false;
  }

  if (type === 'marketing') {
    return !preference.marketingOptIn || Boolean(preference.unsubscribedAt);
  }

  if (type === 'reminder') {
    return !preference.eventReminderEnabled;
  }

  return !preference.transactionalEnabled;
};

const shouldSkipBySuppression = async (to) => {
  const suppression = await EmailSuppression.findOne({
    email: normalizeEmail(to),
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  }).lean();

  return Boolean(suppression);
};

const createLog = async (job, status, details = {}) => {
  return EmailLog.create({
    job: job._id,
    to: job.to,
    type: job.type,
    category: job.category,
    status,
    provider: details.provider || job.provider || '',
    providerMessageId: details.providerMessageId || job.providerMessageId || '',
    error: details.error || '',
    sourceEvent: job.sourceEvent,
    metadata: details.metadata || {}
  });
};

const enqueueEmail = async ({
  to,
  user,
  type = 'transactional',
  category,
  subject,
  template,
  context = {},
  scheduledAt = new Date(),
  priority = 5,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  idempotencyKey,
  sourceEvent = '',
  metadata = {}
}) => {
  const normalizedTo = normalizeEmail(to);

  if (!normalizedTo || !category || !subject || !template) {
    throw new Error('Email job requires to, category, subject, and template.');
  }

  const payload = {
    to: normalizedTo,
    user,
    type,
    category,
    subject,
    template,
    context,
    scheduledAt,
    priority,
    maxAttempts,
    idempotencyKey,
    sourceEvent,
    metadata
  };

  if (!idempotencyKey) {
    return EmailJob.create(payload);
  }

  return EmailJob.findOneAndUpdate(
    { idempotencyKey },
    { $setOnInsert: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const claimNextJob = async () => {
  const now = new Date();
  const lockUntil = new Date(now.getTime() + Number(process.env.EMAIL_JOB_LOCK_MS || DEFAULT_LOCK_MS));

  return EmailJob.findOneAndUpdate(
    {
      $or: [
        {
          status: 'queued',
          scheduledAt: { $lte: now },
          $or: [
            { lockUntil: { $exists: false } },
            { lockUntil: null },
            { lockUntil: { $lte: now } }
          ]
        },
        {
          status: 'processing',
          lockUntil: { $lte: now }
        }
      ]
    },
    {
      $set: {
        status: 'processing',
        lockedAt: now,
        lockUntil
      }
    },
    {
      new: true,
      sort: { priority: -1, scheduledAt: 1, createdAt: 1 }
    }
  );
};

const markSkipped = async (job, reason) => {
  job.status = 'skipped';
  job.lastError = reason;
  job.lockUntil = null;
  await job.save();
  await createLog(job, 'skipped', { error: reason });
  return job;
};

const processEmailJob = async (job) => {
  if (await shouldSkipBySuppression(job.to)) {
    return markSkipped(job, 'Email is suppressed.');
  }

  if (await shouldSkipByPreference(job)) {
    return markSkipped(job, 'Email preference disabled this message type.');
  }

  job.attempts += 1;
  await job.save();

  const result = await sendEmail({
    to: job.to,
    subject: job.subject,
    template: job.template,
    context: job.context
  });

  job.provider = result.provider || '';
  job.providerMessageId = result.messageId || '';

  if (result.accepted || result.dryRun) {
    job.status = result.dryRun ? 'skipped' : 'sent';
    job.sentAt = result.dryRun ? undefined : new Date();
    job.lastError = result.dryRun ? 'Email provider is not configured; dry-run only.' : '';
    job.lockUntil = null;
    await job.save();
    await createLog(job, result.dryRun ? 'skipped' : 'sent', {
      provider: result.provider,
      providerMessageId: result.messageId,
      error: job.lastError
    });
    return job;
  }

  const errorMessage = result.error?.message || 'Email provider rejected the message.';

  if (job.attempts >= job.maxAttempts) {
    job.status = 'failed';
    job.lastError = errorMessage;
    job.lockUntil = null;
    await job.save();
    await createLog(job, 'failed', {
      provider: result.provider,
      error: errorMessage
    });
    return job;
  }

  job.status = 'queued';
  job.lastError = errorMessage;
  job.scheduledAt = new Date(Date.now() + getRetryDelayMs(job.attempts));
  job.lockUntil = null;
  await job.save();
  return job;
};

const processDueEmailJobs = async (limit = DEFAULT_BATCH_SIZE) => {
  let processed = 0;

  while (processed < limit) {
    const job = await claimNextJob();

    if (!job) {
      break;
    }

    try {
      await processEmailJob(job);
    } catch (error) {
      logger.error(`[email-worker] failed processing job ${job._id}: ${error.message}`);
      job.status = job.attempts >= job.maxAttempts ? 'failed' : 'queued';
      job.lastError = error.message;
      job.scheduledAt = new Date(Date.now() + getRetryDelayMs(job.attempts || 1));
      job.lockUntil = null;
      await job.save();
    }

    processed += 1;
  }

  return processed;
};

const startEmailWorker = () => {
  if (process.env.EMAIL_WORKER_ENABLED === 'false' || process.env.NODE_ENV === 'test') {
    return null;
  }

  const intervalMs = Number(process.env.EMAIL_WORKER_INTERVAL_MS || DEFAULT_WORKER_INTERVAL_MS);
  const batchSize = Number(process.env.EMAIL_WORKER_BATCH_SIZE || DEFAULT_BATCH_SIZE);

  const tick = () => {
    processDueEmailJobs(batchSize).catch((error) => {
      logger.error(`[email-worker] loop failed: ${error.message}`);
    });
  };

  const timer = setInterval(tick, intervalMs);
  setTimeout(tick, 1000);
  timer.unref?.();
  return timer;
};

const updateEmailPreference = async ({ email, user, ...updates }) => {
  return EmailPreference.findOneAndUpdate(
    { email: normalizeEmail(email) },
    {
      $set: {
        ...updates,
        ...(user ? { user } : {})
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const suppressEmail = async ({ email, reason = 'manual', source = 'system', expiresAt, metadata = {} }) => {
  return EmailSuppression.findOneAndUpdate(
    { email: normalizeEmail(email) },
    {
      $set: {
        reason,
        source,
        expiresAt,
        metadata
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const createMarketingCampaign = async ({ name, subject, template, context = {}, recipients = [], scheduledAt, segment = {} }) => {
  const campaign = await MarketingCampaign.create({
    name,
    subject,
    template: template || 'marketingCampaign',
    status: scheduledAt ? 'scheduled' : 'sending',
    scheduledAt,
    context,
    segment
  });

  const jobs = await Promise.all((recipients || []).map((recipient) => {
    const recipientEmail = normalizeEmail(recipient.email || recipient);
    const unsubscribeToken = buildUnsubscribeToken(recipientEmail);

    return enqueueEmail({
      to: recipientEmail,
      user: recipient.user,
      type: 'marketing',
      category: 'marketing_campaign',
      subject,
      template: template || 'marketingCampaign',
      context: {
        headline: context.headline || name,
        message: context.message || '',
        ctaLabel: context.ctaLabel || 'View details',
        footerMessage: context.footerMessage || 'See you at the next TicketStage event.',
        ...context,
        unsubscribeUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/unsubscribe?email=${encodeURIComponent(recipientEmail)}&token=${unsubscribeToken}`,
        unsubscribeApiUrl: `${process.env.PUBLIC_API_URL || 'http://localhost:5000'}/api/notifications/unsubscribe?email=${encodeURIComponent(recipientEmail)}&token=${unsubscribeToken}`
      },
      scheduledAt: scheduledAt || new Date(),
      priority: 3,
      idempotencyKey: `marketing:${campaign._id}:${recipientEmail}`,
      metadata: { campaignId: campaign._id.toString() }
    });
  }));

  campaign.stats.queued = jobs.length;
  await campaign.save();
  return campaign;
};

module.exports = {
  createMarketingCampaign,
  buildUnsubscribeToken,
  enqueueEmail,
  processDueEmailJobs,
  startEmailWorker,
  suppressEmail,
  updateEmailPreference
};
