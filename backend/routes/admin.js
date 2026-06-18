const express = require('express');
const { body, param } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const validateRequest = require('../middleware/validateRequest');
const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRole(['admin']));

router.get('/stats', adminController.getDashboardStats);
router.get('/bookings', adminController.getAllBookings);
router.put('/bookings/:id/payment', [
  param('id')
    .isMongoId()
    .withMessage('Mã đơn đặt vé không hợp lệ'),
  body('paymentStatus')
    .isIn(['pending', 'completed', 'failed', 'refunded'])
    .withMessage('Trạng thái thanh toán không hợp lệ'),
  validateRequest
], adminController.updatePaymentStatus);

module.exports = router;
