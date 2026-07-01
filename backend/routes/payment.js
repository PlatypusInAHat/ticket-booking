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
  message: 'Ban dang gui qua nhieu yeu cau thanh toan. Vui long thu lai sau.'
});

router.post('/session', [
  paymentLimiter,
  body('bookingId')
    .isMongoId()
    .withMessage('Ma don dat ve khong hop le'),
  body('provider')
    .optional()
    .isIn(['mock', 'vnpay', 'momo', 'credit_card', 'debit_card'])
    .withMessage('Cong thanh toan khong hop le'),
  validateRequest
], paymentController.createPaymentSession);

router.post('/process', [
  paymentLimiter,
  body('bookingId')
    .isMongoId()
    .withMessage('Ma don dat ve khong hop le'),
  body('paymentToken')
    .isString()
    .trim()
    .isLength({ min: 6, max: 512 })
    .withMessage('Payment token khong hop le'),
  validateRequest
], paymentController.processPayment);

router.get('/:bookingId', [
  param('bookingId')
    .isMongoId()
    .withMessage('Ma don dat ve khong hop le'),
  validateRequest
], paymentController.getPaymentStatus);

module.exports = router;
