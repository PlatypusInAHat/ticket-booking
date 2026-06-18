const express = require('express');
const { body, query } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const checkinController = require('../controllers/checkinController');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRole(['admin', 'staff']));

const scanInputRules = () => [
  body()
    .custom((value) => Boolean(value?.code || value?.scanToken || value?.nfcPayload))
    .withMessage('Cần gửi mã vé, scan token hoặc NFC payload'),
  body('method')
    .optional()
    .isIn(['qr', 'barcode', 'nfc', 'manual', 'unknown'])
    .withMessage('Phương thức check-in không hợp lệ'),
  body('gate')
    .optional()
    .trim()
    .isLength({ max: 80 })
    .withMessage('Tên cổng quá dài'),
  body('deviceId')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Mã thiết bị quá dài')
];

router.post('/validate', [
  ...scanInputRules(),
  validateRequest
], checkinController.validatePass);

router.post('/', [
  ...scanInputRules(),
  body('appVersion')
    .optional()
    .trim()
    .isLength({ max: 40 })
    .withMessage('Phiên bản app quá dài'),
  validateRequest
], checkinController.checkInPass);

router.get('/stats', [
  query('ticketId')
    .optional()
    .isMongoId()
    .withMessage('Mã vé không hợp lệ'),
  validateRequest
], checkinController.getCheckInStats);

module.exports = router;
