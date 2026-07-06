const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const eventController = require('../controllers/eventController');
const validateRequest = require('../middleware/validateRequest');
const { cacheMiddleware } = require('../utils/cache');

const router = express.Router();

const eventIdParam = () => param('id')
  .isMongoId()
  .withMessage('Event ID is invalid');

const eventLookupParam = () => param('id')
  .custom((value) => /^[a-z0-9-]+$/i.test(value))
  .withMessage('Event slug is invalid');

const eventTypeRule = () => body('eventType')
  .optional()
  .isIn(['concert', 'train', 'flight', 'movie', 'sports', 'theater', 'conference', 'festival', 'workshop', 'other'])
  .withMessage('Event type is invalid');

const eventWriteRules = () => [
  body('companyId')
    .optional()
    .isMongoId()
    .withMessage('Company ID is invalid'),
  body('company')
    .optional()
    .isMongoId()
    .withMessage('Company ID is invalid'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 180 })
    .withMessage('Title must be between 2 and 180 characters'),
  eventTypeRule(),
  body('startsAt')
    .optional()
    .isISO8601()
    .withMessage('startsAt is invalid'),
  body('endsAt')
    .optional()
    .isISO8601()
    .withMessage('endsAt is invalid'),
  body('location.venue')
    .optional()
    .trim()
    .isLength({ min: 1, max: 160 })
    .withMessage('Venue is invalid'),
  body('location.city')
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('City is invalid')
];

router.get('/', [
  query('companyId')
    .optional()
    .isMongoId()
    .withMessage('Company ID is invalid'),
  query('status')
    .optional()
    .isIn(['draft', 'published', 'sold_out', 'cancelled', 'completed', 'archived', 'all'])
    .withMessage('Status is invalid'),
  query('eventType')
    .optional()
    .isIn(['concert', 'train', 'flight', 'movie', 'sports', 'theater', 'conference', 'festival', 'workshop', 'other'])
    .withMessage('Event type is invalid'),
  query('city')
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('City is invalid'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Search is invalid'),
  query('tag')
    .optional()
    .trim()
    .isLength({ min: 1, max: 60 })
    .withMessage('Tag is invalid'),
  query('startsFrom')
    .optional()
    .isISO8601()
    .withMessage('startsFrom is invalid'),
  query('startsTo')
    .optional()
    .isISO8601()
    .withMessage('startsTo is invalid'),
  query('endsFrom')
    .optional()
    .isISO8601()
    .withMessage('endsFrom is invalid'),
  query('endsTo')
    .optional()
    .isISO8601()
    .withMessage('endsTo is invalid'),
  query('sortBy')
    .optional()
    .isIn(['startsAt', 'createdAt', 'title', 'stats.views', 'stats.soldTickets'])
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
    .withMessage('limit must be between 1 and 100'),
  validateRequest,
  cacheMiddleware(60)
], eventController.getEvents);
router.get('/:id', [eventLookupParam(), validateRequest, cacheMiddleware(300)], eventController.getEventById);
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
router.delete('/:id', [
  authenticateToken,
  authorizeRole(['admin', 'organizer']),
  eventIdParam(),
  validateRequest
], eventController.deleteEvent);

module.exports = router;
