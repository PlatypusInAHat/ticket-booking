const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const ticketController = require('../controllers/ticketController');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

const ticketIdParam = () => param('id')
  .isMongoId()
  .withMessage('Ticket ID is invalid');

const listRules = () => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  query('eventType')
    .optional()
    .isIn(['concert', 'train', 'flight', 'movie', 'sports', 'theater', 'conference', 'festival', 'workshop', 'other'])
    .withMessage('Event type is invalid'),
  query('companyId')
    .optional()
    .isMongoId()
    .withMessage('Company ID is invalid'),
  query('eventId')
    .optional()
    .isMongoId()
    .withMessage('Event ID is invalid'),
  query('sessionId')
    .optional()
    .isMongoId()
    .withMessage('Session ID is invalid'),
  query('status')
    .optional()
    .isIn(['draft', 'published', 'sold_out', 'cancelled', 'completed', 'all'])
    .withMessage('Status is invalid'),
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
  query('sortBy')
    .optional()
    .isIn(['date', 'price', 'availableSeats', 'createdAt', 'soldSeats'])
    .withMessage('sortBy is invalid'),
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('order is invalid'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('minPrice is invalid'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('maxPrice is invalid'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('dateFrom is invalid'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('dateTo is invalid'),
  query('availableOnly')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('availableOnly must be true or false')
];

const ticketWriteRules = () => [
  body('eventId')
    .optional()
    .isMongoId()
    .withMessage('Event ID is invalid'),
  body('event')
    .optional()
    .isMongoId()
    .withMessage('Event ID is invalid'),
  body('eventName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 160 })
    .withMessage('Event name must be between 2 and 160 characters'),
  body('eventType')
    .optional()
    .isIn(['concert', 'train', 'flight', 'movie', 'sports', 'theater', 'conference', 'festival', 'workshop', 'other'])
    .withMessage('Event type is invalid'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('availableSeats')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Available seats is invalid'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date is invalid'),
  body('category')
    .optional()
    .isIn(['standard', 'vip', 'premium', 'early_bird', 'student', 'child', 'group'])
    .withMessage('Category is invalid'),
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
