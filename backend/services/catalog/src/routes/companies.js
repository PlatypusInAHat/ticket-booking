const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../../../../middleware/auth');
const companyController = require('../controllers/companyController');
const validateRequest = require('../../../../middleware/validateRequest');

const router = express.Router();

const companyIdParam = () => param('id')
  .isMongoId()
  .withMessage('Company ID is invalid');

const companyWriteRules = () => [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 160 })
    .withMessage('Company name must be between 2 and 160 characters'),
  body('contact.email')
    .optional()
    .isEmail()
    .withMessage('Contact email is invalid')
    .normalizeEmail(),
  body('contact.phone')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Phone number is too long'),
  body('taxCode')
    .optional()
    .trim()
    .isLength({ max: 40 })
    .withMessage('Tax code is too long')
];

router.get('/', [
  authenticateToken,
  query('status')
    .optional()
    .isIn(['pending', 'active', 'suspended', 'archived'])
    .withMessage('Status is invalid'),
  query('verificationStatus')
    .optional()
    .isIn(['unverified', 'pending', 'verified', 'rejected'])
    .withMessage('Verification status is invalid'),
  query('mine')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('mine must be true or false'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Search is invalid'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'name', 'status', 'verification.status'])
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
  validateRequest
], companyController.getCompanies);
router.get('/:id', [companyIdParam(), validateRequest], companyController.getCompanyById);
router.post('/', [
  authenticateToken,
  authorizeRole(['admin', 'organizer']),
  ...companyWriteRules(),
  body('name')
    .exists({ checkFalsy: true })
    .withMessage('Company name is required'),
  validateRequest
], companyController.createCompany);
router.put('/:id', [
  authenticateToken,
  authorizeRole(['admin', 'organizer']),
  companyIdParam(),
  ...companyWriteRules(),
  validateRequest
], companyController.updateCompany);

module.exports = router;
