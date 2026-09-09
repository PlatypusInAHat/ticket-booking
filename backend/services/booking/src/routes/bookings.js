const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../../../../middleware/auth');
const bookingController = require('../controllers/bookingController');
const passController = require('../controllers/passController');
const validateRequest = require('../../../../middleware/validateRequest');
const { createEnvRateLimiter } = require('../../../../middleware/rateLimit');
const { botProtectionService } = require('@ticket-booking/platform');
const { ApiResponse, asyncHandler } = require('@ticket-booking/shared');
const PromoCode = require('../models/PromoCode');
const { createPromoCode, validatePromoCode } = require('../services/promoCodeService');

const { verifyCheckoutBotProtection } = botProtectionService;

const router = express.Router();

router.use(authenticateToken);

const bookingCreateLimiter = createEnvRateLimiter({
  name: 'booking-create',
  windowEnv: 'BOOKING_CREATE_RATE_LIMIT_WINDOW_MS',
  maxEnv: 'BOOKING_CREATE_RATE_LIMIT_MAX',
  defaultWindowMs: 60 * 1000,
  defaultMax: 8,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: 'You are creating too many bookings. Please try again in a few minutes.'
});

const bookingIdParam = () => param('id')
  .isMongoId()
  .withMessage('Booking ID is invalid');

const passIdParam = () => param('passId')
  .isMongoId()
  .withMessage('Pass ID is invalid');

const listQueryRules = () => [
  query('bookingStatus')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled', 'all'])
    .withMessage('bookingStatus is invalid'),
  query('paymentStatus')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'refunded', 'all'])
    .withMessage('paymentStatus is invalid'),
  query('paymentMethod')
    .optional()
    .isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'vnpay', 'momo', 'zalopay', 'cash', 'other', 'all'])
    .withMessage('paymentMethod is invalid'),
  query('source')
    .optional()
    .isIn(['web', 'mobile', 'admin', 'api', 'all'])
    .withMessage('source is invalid'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('search is invalid'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('dateFrom is invalid'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('dateTo is invalid'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'totalAmount', 'bookingNumber'])
    .withMessage('sortBy is invalid'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('order is invalid'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100')
];

router.get('/queue/status', authorizeRole(['admin']), bookingController.getQueueStatus);

router.get('/promotions', authorizeRole(['admin']), asyncHandler(async (req, res) => {
  const promotions = await PromoCode.find().sort({ createdAt: -1 }).limit(100);
  res.status(200).json(new ApiResponse(200, promotions));
}));

router.post('/promotions/preview', [
  body('code').trim().isLength({ min: 3, max: 32 }).matches(/^[A-Za-z0-9_-]+$/),
  body('subtotal').isFloat({ min: 0 }),
  body('eventIds').optional().isArray({ max: 20 }),
  body('eventIds.*').optional().isMongoId(),
  validateRequest
], asyncHandler(async (req, res) => {
  const result = await validatePromoCode({
    code: req.body.code,
    subtotal: Number(req.body.subtotal),
    eventIds: req.body.eventIds || [],
    userId: req.user.id
  });
  res.status(200).json(new ApiResponse(200, {
    code: result.code,
    discount: result.discount,
    grandTotal: result.grandTotal
  }));
}));

router.post('/promotions', [
  authorizeRole(['admin']),
  body('code').trim().isLength({ min: 3, max: 32 }).matches(/^[A-Za-z0-9_-]+$/),
  body('name').trim().isLength({ min: 2, max: 120 }),
  body('discountType').isIn(['percentage', 'fixed']),
  body('value').isFloat({ min: 0 }),
  body('minOrderAmount').optional().isFloat({ min: 0 }),
  body('maxDiscountAmount').optional().isFloat({ min: 0 }),
  body('eventIds').optional().isArray({ max: 100 }),
  body('eventIds.*').optional().isMongoId(),
  body('startsAt').optional().isISO8601(),
  body('endsAt').optional().isISO8601(),
  body('usageLimit').optional().isInt({ min: 0 }),
  body('perUserLimit').optional().isInt({ min: 1 }),
  validateRequest
], asyncHandler(async (req, res) => {
  const promotion = await createPromoCode(req.body, req.user);
  res.status(201).json(new ApiResponse(201, promotion, 'Promotion created'));
}));

router.post('/', [
  bookingCreateLimiter,
  verifyCheckoutBotProtection,
  body('tickets')
    .isArray({ min: 1 })
    .withMessage('Can choose at least one ticket'),
  body('tickets.*')
    .custom((item) => Boolean(item?.ticketId || item?.ticket?._id || item?.ticket))
    .withMessage('Each item must include ticketId'),
  body('tickets.*.quantity')
    .isInt({ min: 1, max: 20 })
    .withMessage('Quantity must be between 1 and 20'),
  body('tickets.*.seatCodes')
    .optional()
    .isArray({ min: 1, max: 20 })
    .withMessage('seatCodes must contain between 1 and 20 seats'),
  body('tickets.*.seatCodes.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 30 })
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('Seat code is invalid'),
  body('paymentMethod')
    .isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'vnpay', 'momo', 'zalopay', 'cash', 'other'])
    .withMessage('Payment method is invalid'),
  body('source')
    .optional()
    .isIn(['web', 'mobile', 'admin', 'api'])
    .withMessage('Source is invalid'),
  body('turnstileToken')
    .optional()
    .isString()
    .isLength({ min: 1, max: 2048 })
    .withMessage('Human verification token is invalid'),
  body('captchaToken')
    .optional()
    .isString()
    .isLength({ min: 1, max: 2048 })
    .withMessage('Human verification token is invalid'),
  body('deviceFingerprint')
    .optional()
    .isString()
    .isLength({ min: 8, max: 256 })
    .withMessage('Device fingerprint is invalid'),
  body('promoCode')
    .optional()
    .trim()
    .isLength({ min: 3, max: 32 })
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('Promotion code is invalid'),
  validateRequest
], bookingController.createBooking);
router.get('/', [...listQueryRules(), validateRequest], bookingController.getUserBookings);
router.get('/:id/passes', [bookingIdParam(), validateRequest], passController.getBookingPasses);
router.get('/:id/passes/:passId', [bookingIdParam(), passIdParam(), validateRequest], passController.getPassDetail);
router.get('/:id/passes/:passId/qr.png', [bookingIdParam(), passIdParam(), validateRequest], passController.getPassQrImage);
router.get('/:id/passes/:passId/barcode.png', [bookingIdParam(), passIdParam(), validateRequest], passController.getPassBarcodeImage);
router.get('/:id/passes/:passId/nfc-payload', [bookingIdParam(), passIdParam(), validateRequest], passController.getPassNfcPayload);
router.get('/:id', [bookingIdParam(), validateRequest], bookingController.getBookingById);
router.post('/:id/refund-request', [
  bookingIdParam(),
  body('reason')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Refund reason must be between 10 and 500 characters'),
  validateRequest
], bookingController.requestRefund);
router.post('/:id/cancel', [bookingIdParam(), validateRequest], bookingController.cancelBooking);
router.put('/:id/cancel', [bookingIdParam(), validateRequest], bookingController.cancelBooking);

module.exports = router;
