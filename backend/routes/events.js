const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const eventController = require('../controllers/eventController');
const validateRequest = require('../middleware/validateRequest');
const { cacheMiddleware } = require('../utils/cache');

const router = express.Router();

const eventIdParam = () => param('id')
  .isMongoId()
  .withMessage('Mã sự kiện không hợp lệ');

const eventTypeRule = () => body('eventType')
  .optional()
  .isIn(['concert', 'train', 'flight', 'movie', 'sports', 'theater', 'conference', 'festival', 'workshop', 'other'])
  .withMessage('Loại sự kiện không hợp lệ');

const eventWriteRules = () => [
  body('companyId')
    .optional()
    .isMongoId()
    .withMessage('Mã công ty không hợp lệ'),
  body('company')
    .optional()
    .isMongoId()
    .withMessage('Mã công ty không hợp lệ'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 180 })
    .withMessage('Tên sự kiện phải có từ 2 đến 180 ký tự'),
  eventTypeRule(),
  body('startsAt')
    .optional()
    .isISO8601()
    .withMessage('Thời gian bắt đầu không hợp lệ'),
  body('endsAt')
    .optional()
    .isISO8601()
    .withMessage('Thời gian kết thúc không hợp lệ'),
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

router.get('/', [
  query('companyId')
    .optional()
    .isMongoId()
    .withMessage('Mã công ty không hợp lệ'),
  query('eventType')
    .optional()
    .isIn(['concert', 'train', 'flight', 'movie', 'sports', 'theater', 'conference', 'festival', 'workshop', 'other'])
    .withMessage('Loại sự kiện không hợp lệ'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Trang phải là số nguyên dương'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Giới hạn phải từ 1 đến 100'),
  validateRequest,
  cacheMiddleware(60) // Cache for 60 seconds
], eventController.getEvents);
router.get('/:id', [eventIdParam(), validateRequest, cacheMiddleware(300)], eventController.getEventById);
router.post('/bundle', [
  authenticateToken,
  authorizeRole(['admin', 'organizer'])
], eventController.createEventBundle);

router.post('/', [
  authenticateToken,
  authorizeRole(['admin', 'organizer']),
  ...eventWriteRules(),
  validateRequest
], eventController.createEvent);
router.put('/:id', [
  authenticateToken,
  authorizeRole(['admin', 'organizer']),
  eventIdParam(),
  ...eventWriteRules(),
  validateRequest
], eventController.updateEvent);

module.exports = router;
