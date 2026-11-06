const express = require('express');
const { body, query } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../../../../middleware/auth');
const checkinController = require('../controllers/checkinController');
const validateRequest = require('../../../../middleware/validateRequest');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRole(['admin', 'staff']));

const scanInputRules = () => [
  body()
    .custom((value) => Boolean(value?.code || value?.scanToken || value?.nfcPayload))
    .withMessage('You must provide a ticket code, scan token, or NFC payload'),
  body('method')
    .optional()
    .isIn(['qr', 'barcode', 'nfc', 'manual', 'unknown'])
    .withMessage('Check-in method is invalid'),
  body('gate')
    .optional()
    .trim()
    .isLength({ max: 80 })
    .withMessage('Gate name is too long'),
  body('deviceId')
    .optional()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Device ID is too long')
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
    .withMessage('App version is too long'),
  validateRequest
], checkinController.checkInPass);

router.get('/events', checkinController.getCheckInEvents);

router.get('/stats', [
  query('ticketId')
    .optional()
    .isMongoId()
    .withMessage('Ticket ID is invalid'),
  validateRequest
], checkinController.getCheckInStats);

router.post('/offline/manifest', [
  body('eventId').isMongoId().withMessage('Event ID is invalid'),
  body('deviceId').trim().isLength({ min: 3, max: 120 }).withMessage('Device ID is invalid'),
  body('gate').optional().trim().isLength({ max: 80 }).withMessage('Gate name is too long'),
  body('appVersion').optional().trim().isLength({ max: 40 }).withMessage('App version is too long'),
  validateRequest
], checkinController.createOfflineManifest);

router.post('/offline/sync', [
  body('deviceId').trim().isLength({ min: 3, max: 120 }).withMessage('Device ID is invalid'),
  body('eventId').isMongoId().withMessage('Event ID is invalid'),
  body('items').isArray({ min: 1, max: 100 }).withMessage('Sync batch must contain 1 to 100 scans'),
  body('items.*.localId').trim().isLength({ min: 8, max: 120 }).withMessage('Offline scan ID is invalid'),
  body('items.*.code').trim().isLength({ min: 3, max: 512 }).withMessage('Offline scan code is invalid'),
  body('items.*.method').isIn(['qr', 'barcode', 'nfc', 'manual']).withMessage('Check-in method is invalid'),
  body('items.*.scannedAt').isISO8601().withMessage('Offline scan time is invalid'),
  body('gate').optional().trim().isLength({ max: 80 }).withMessage('Gate name is too long'),
  body('appVersion').optional().trim().isLength({ max: 40 }).withMessage('App version is too long'),
  validateRequest
], checkinController.syncOfflineCheckIns);

module.exports = router;
