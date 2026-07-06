const express = require('express');
const { body, param } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');
const validateRequest = require('../middleware/validateRequest');
const { createEnvRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/webhooks/momo', paymentController.handleMomoWebhook);
router.get('/webhooks/vnpay', paymentController.handleVnpayWebhook);
router.get('/return/vnpay', paymentController.handleVnpayReturn);

router.use(authenticateToken);

const paymentLimiter = createEnvRateLimiter({
  name: 'payment-write',
  windowEnv: 'PAYMENT_RATE_LIMIT_WINDOW_MS',
  maxEnv: 'PAYMENT_RATE_LIMIT_MAX',
  defaultWindowMs: 60 * 1000,
  defaultMax: 12,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: 'You are sending too many payment requests. Please try again later.'
});

router.post('/session', [
  paymentLimiter,
  body('bookingId')
    .isMongoId()
    .withMessage('Booking ID is invalid'),
  body('provider')
    .optional()
    .isIn(['mock', 'vnpay', 'momo', 'credit_card', 'debit_card'])
    .withMessage('Payment provider is invalid'),
  validateRequest
], paymentController.createPaymentSession);

router.post('/process', [
  paymentLimiter,
  body('bookingId')
    .isMongoId()
    .withMessage('Booking ID is invalid'),
  body('paymentToken')
    .isString()
    .trim()
    .isLength({ min: 6, max: 512 })
    .withMessage('Payment token is invalid'),
  validateRequest
], paymentController.processPayment);

router.get('/:bookingId', [
  param('bookingId')
    .isMongoId()
    .withMessage('Booking ID is invalid'),
  validateRequest
], paymentController.getPaymentStatus);

module.exports = router;
