const ApiError = require('../utils/ApiError');
const {
  hmacSha256,
  sanitizeFingerprint,
  sanitizeToken
} = require('../utils/securityUtils');
const { getClientIp } = require('../middleware/rateLimit');

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseSourceList = (value, fallback = ['web']) => {
  if (!value) {
    return fallback;
  }

  return String(value)
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
};

const getRequestSource = (req) => String(req.body?.source || 'web').toLowerCase();

const isTurnstileRequiredForSource = (req) => {
  if (!parseBoolean(process.env.TURNSTILE_ENABLED, false)) {
    return false;
  }

  const protectedSources = parseSourceList(process.env.TURNSTILE_PROTECTED_SOURCES, ['web']);
  return protectedSources.includes('*') || protectedSources.includes(getRequestSource(req));
};

const getTurnstileToken = (req) => sanitizeToken(
  req.body?.turnstileToken ||
  req.body?.captchaToken ||
  req.get('cf-turnstile-response') ||
  req.get('x-turnstile-token') ||
  ''
);

const verifyTurnstileToken = async ({ token, remoteIp }) => {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    throw new ApiError(500, 'Turnstile is enabled but TURNSTILE_SECRET_KEY is not configured');
  }

  if (!token) {
    throw new ApiError(403, 'Human verification is required before checkout');
  }

  const body = new URLSearchParams({
    secret,
    response: token
  });

  if (remoteIp && remoteIp !== 'unknown') {
    body.set('remoteip', remoteIp);
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!response.ok) {
    throw new ApiError(502, 'Could not verify human challenge');
  }

  const payload = await response.json();
  if (!payload.success) {
    throw new ApiError(403, 'Human verification failed. Please retry the challenge.');
  }

  return {
    success: true,
    challengeTs: payload.challenge_ts || '',
    hostname: payload.hostname || '',
    action: payload.action || '',
    cdata: payload.cdata || ''
  };
};

const getDeviceFingerprint = (req) => sanitizeFingerprint(
  req.body?.deviceFingerprint ||
  req.get('x-device-fingerprint') ||
  ''
);

const getDeviceFingerprintHash = (fingerprint) => (
  fingerprint ? hmacSha256(fingerprint) : ''
);

const readCloudflareBotScore = (req) => {
  const score = Number.parseInt(
    req.get('cf-bot-score') ||
    req.get('x-cloudflare-bot-score') ||
    '',
    10
  );

  return Number.isFinite(score) ? score : null;
};

const assessBotRisk = (req, { deviceFingerprint = '', turnstileVerified = false } = {}) => {
  const userAgent = req.get('user-agent') || '';
  const source = getRequestSource(req);
  const cloudflareBotScore = readCloudflareBotScore(req);
  let score = 0;
  const reasons = [];

  if (!deviceFingerprint && ['web', 'mobile'].includes(source)) {
    score += 30;
    reasons.push('missing_device_fingerprint');
  }

  if (!userAgent) {
    score += 15;
    reasons.push('missing_user_agent');
  } else if (/(bot|spider|crawler|scrapy|curl|wget|python|httpclient|headless)/i.test(userAgent)) {
    score += 30;
    reasons.push('suspicious_user_agent');
  }

  if (cloudflareBotScore !== null && cloudflareBotScore < 30) {
    score += 40;
    reasons.push('low_cloudflare_bot_score');
  }

  if (isTurnstileRequiredForSource(req) && !turnstileVerified) {
    score += 45;
    reasons.push('missing_turnstile');
  }

  return {
    score: Math.min(score, 100),
    reasons,
    cloudflareBotScore,
    source
  };
};

const verifyCheckoutBotProtection = async (req, res, next) => {
  try {
    const remoteIp = getClientIp(req);
    const deviceFingerprint = getDeviceFingerprint(req);
    const deviceFingerprintHash = getDeviceFingerprintHash(deviceFingerprint);
    let turnstile = { success: false };

    if (isTurnstileRequiredForSource(req)) {
      turnstile = await verifyTurnstileToken({
        token: getTurnstileToken(req),
        remoteIp
      });
    }

    const risk = assessBotRisk(req, {
      deviceFingerprint,
      turnstileVerified: Boolean(turnstile.success)
    });
    const blockThreshold = parsePositiveInt(process.env.BOT_RISK_BLOCK_THRESHOLD, 90);

    if (risk.score >= blockThreshold) {
      throw new ApiError(403, 'Checkout request was blocked by bot protection');
    }

    req.botProtection = {
      deviceFingerprintHash,
      remoteIp,
      risk,
      turnstile
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  assessBotRisk,
  getDeviceFingerprint,
  getDeviceFingerprintHash,
  getTurnstileToken,
  isTurnstileRequiredForSource,
  verifyCheckoutBotProtection,
  verifyTurnstileToken
};
