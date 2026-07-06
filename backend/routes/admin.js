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
    .withMessage('Booking ID is invalid'),
  body('paymentStatus')
    .isIn(['pending', 'completed', 'failed', 'refunded'])
    .withMessage('Payment status is invalid'),
  validateRequest
], adminController.updatePaymentStatus);

router.get('/users', adminController.getAllUsers);
router.put('/users/:id/role', [
  param('id').isMongoId().withMessage('User ID is invalid'),
  body('role').isIn(['user', 'admin', 'staff', 'organizer']).withMessage('Role is invalid'),
  validateRequest
], adminController.updateUserRole);

module.exports = router;
