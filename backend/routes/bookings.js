const express = require('express');
const { body, param } = require('express-validator');
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
  message: 'Ban dang tao qua nhieu don dat ve. Vui long thu lai sau it phut.'
});

const bookingIdParam = () => param('id')
  .isMongoId()
  .withMessage('Mã đơn đặt vé không hợp lệ');

const passIdParam = () => param('passId')
  .isMongoId()
  .withMessage('Mã vé điện tử không hợp lệ');

router.get('/queue/status', authorizeRole(['admin']), bookingController.getQueueStatus);

router.post('/', [
  bookingCreateLimiter,
  body('tickets')
    .isArray({ min: 1 })
    .withMessage('Cần chọn ít nhất một loại vé'),
  body('tickets.*')
    .custom((item) => Boolean(item?.ticketId || item?.ticket?._id || item?.ticket))
    .withMessage('Mỗi dòng vé cần có ticketId'),
  body('tickets.*.quantity')
    .isInt({ min: 1, max: 20 })
    .withMessage('Số lượng mỗi loại vé phải từ 1 đến 20'),
  body('paymentMethod')
    .isIn(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'vnpay', 'momo', 'zalopay', 'cash', 'other'])
    .withMessage('Phương thức thanh toán không hợp lệ'),
  body('source')
    .optional()
    .isIn(['web', 'mobile', 'admin', 'api'])
    .withMessage('Nguồn đặt vé không hợp lệ'),
  validateRequest
], bookingController.createBooking);
router.get('/', bookingController.getUserBookings);
router.get('/:id/passes', [bookingIdParam(), validateRequest], passController.getBookingPasses);
router.get('/:id/passes/:passId', [bookingIdParam(), passIdParam(), validateRequest], passController.getPassDetail);
router.get('/:id/passes/:passId/qr.png', [bookingIdParam(), passIdParam(), validateRequest], passController.getPassQrImage);
router.get('/:id/passes/:passId/barcode.png', [bookingIdParam(), passIdParam(), validateRequest], passController.getPassBarcodeImage);
router.get('/:id/passes/:passId/nfc-payload', [bookingIdParam(), passIdParam(), validateRequest], passController.getPassNfcPayload);
router.get('/:id', [bookingIdParam(), validateRequest], bookingController.getBookingById);
router.post('/:id/cancel', [bookingIdParam(), validateRequest], bookingController.cancelBooking);
router.put('/:id/cancel', [bookingIdParam(), validateRequest], bookingController.cancelBooking);

module.exports = router;
