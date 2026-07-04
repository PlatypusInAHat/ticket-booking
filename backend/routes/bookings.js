const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const bookingController = require('../controllers/bookingController');
const passController = require('../controllers/passController');
const validateRequest = require('../middleware/validateRequest');
const { createEnvRateLimiter } = require('../middleware/rateLimit');

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

router.post('/', [
  bookingCreateLimiter,
  body('tickets')
    .isArray({ min: 1 })
    .withMessage('Can choose at least one ticket'),
  body('tickets.*')
    .custom((item) => Boolean(item?.ticketId || item?.ticket?._id || item?.ticket))
    .withMessage('Each item must include ticketId'),
  body('tickets.*.quantity')
    .isInt({ min: 1, max: 20 })
    .withMessage('Quantity must be between 1 and 20'),
  body('paymentMethod')
    .isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'vnpay', 'momo', 'zalopay', 'cash', 'other'])
    .withMessage('Payment method is invalid'),
  body('source')
    .optional()
    .isIn(['web', 'mobile', 'admin', 'api'])
    .withMessage('Source is invalid'),
  validateRequest
], bookingController.createBooking);
router.get('/', [...listQueryRules(), validateRequest], bookingController.getUserBookings);
router.get('/:id/passes', [bookingIdParam(), validateRequest], passController.getBookingPasses);
router.get('/:id/passes/:passId', [bookingIdParam(), passIdParam(), validateRequest], passController.getPassDetail);
router.get('/:id/passes/:passId/qr.png', [bookingIdParam(), passIdParam(), validateRequest], passController.getPassQrImage);
router.get('/:id/passes/:passId/barcode.png', [bookingIdParam(), passIdParam(), validateRequest], passController.getPassBarcodeImage);
router.get('/:id/passes/:passId/nfc-payload', [bookingIdParam(), passIdParam(), validateRequest], passController.getPassNfcPayload);
router.get('/:id', [bookingIdParam(), validateRequest], bookingController.getBookingById);
router.post('/:id/cancel', [bookingIdParam(), validateRequest], bookingController.cancelBooking);
router.put('/:id/cancel', [bookingIdParam(), validateRequest], bookingController.cancelBooking);

module.exports = router;
