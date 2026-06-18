const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const ticketController = require('../controllers/ticketController');
const validateRequest = require('../middleware/validateRequest');
const router = express.Router();

const ticketIdParam = () => param('id')
  .isMongoId()
  .withMessage('Mã vé không hợp lệ');

const listRules = () => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Trang phải là số nguyên dương'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Giới hạn phải từ 1 đến 100'),
  query('eventType')
    .optional()
    .isIn(['concert', 'train', 'flight', 'movie', 'sports', 'theater', 'conference', 'festival', 'workshop', 'other'])
    .withMessage('Loại sự kiện không hợp lệ'),
  query('companyId')
    .optional()
    .isMongoId()
    .withMessage('Mã công ty không hợp lệ'),
  query('eventId')
    .optional()
    .isMongoId()
    .withMessage('Mã sự kiện không hợp lệ')
];

const ticketWriteRules = () => [
  body('eventId')
    .optional()
    .isMongoId()
    .withMessage('Mã sự kiện không hợp lệ'),
  body('event')
    .optional()
    .isMongoId()
    .withMessage('Mã sự kiện không hợp lệ'),
  body('eventName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 160 })
    .withMessage('Tên sự kiện phải có từ 2 đến 160 ký tự'),
  body('eventType')
    .optional()
    .isIn(['concert', 'train', 'flight', 'movie', 'sports', 'theater', 'conference', 'festival', 'workshop', 'other'])
    .withMessage('Loại sự kiện không hợp lệ'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Giá vé phải lớn hơn hoặc bằng 0'),
  body('availableSeats')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Số ghế còn lại không hợp lệ'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Ngày sự kiện không hợp lệ'),
  body('category')
    .optional()
    .isIn(['standard', 'vip', 'premium', 'early_bird', 'student', 'child', 'group'])
    .withMessage('Hạng vé không hợp lệ'),
  body('location.venue')
    .optional()
    .trim()
    .isLength({ min: 1, max: 160 })
    .withMessage('Địa điểm không hợp lệ'),
  body('location.city')
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Thành phố không hợp lệ')
];

router.get('/', [...listRules(), validateRequest], ticketController.getAllTickets);
router.get('/:id', [ticketIdParam(), validateRequest], ticketController.getTicketById);
router.post('/', [
  authenticateToken,
  authorizeRole(['organizer', 'admin']),
  ...ticketWriteRules(),
  validateRequest
], ticketController.createTicket);
router.put('/:id', [
  authenticateToken,
  authorizeRole(['organizer', 'admin']),
  ticketIdParam(),
  ...ticketWriteRules(),
  validateRequest
], ticketController.updateTicket);
router.delete('/:id', [
  authenticateToken,
  authorizeRole(['organizer', 'admin']),
  ticketIdParam(),
  validateRequest
], ticketController.deleteTicket);

module.exports = router;
