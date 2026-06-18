const express = require('express');
const { body, param, query } = require('express-validator');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const companyController = require('../controllers/companyController');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

const companyIdParam = () => param('id')
  .isMongoId()
  .withMessage('Mã công ty không hợp lệ');

const companyWriteRules = () => [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 160 })
    .withMessage('Tên công ty phải có từ 2 đến 160 ký tự'),
  body('contact.email')
    .optional()
    .isEmail()
    .withMessage('Email liên hệ không hợp lệ')
    .normalizeEmail(),
  body('contact.phone')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Số điện thoại quá dài'),
  body('taxCode')
    .optional()
    .trim()
    .isLength({ max: 40 })
    .withMessage('Mã số thuế quá dài')
];

router.get('/', [
  authenticateToken,
  query('status')
    .optional()
    .isIn(['pending', 'active', 'suspended', 'archived'])
    .withMessage('Trạng thái công ty không hợp lệ'),
  query('mine')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Tham số mine không hợp lệ'),
  validateRequest
], companyController.getCompanies);
router.get('/:id', [companyIdParam(), validateRequest], companyController.getCompanyById);
router.post('/', [
  authenticateToken,
  authorizeRole(['admin', 'organizer']),
  ...companyWriteRules(),
  body('name')
    .exists({ checkFalsy: true })
    .withMessage('Tên công ty là bắt buộc'),
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
