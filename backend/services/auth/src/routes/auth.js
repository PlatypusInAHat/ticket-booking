const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validateRequest = require('../../../../middleware/validateRequest');
const { authenticateToken } = require('../../../../middleware/auth');
const router = express.Router();

const emailRule = () => body('email')
  .isEmail()
  .withMessage('Email is invalid')
  .normalizeEmail();

router.post('/register', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  emailRule(),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Confirm password does not match'),
  validateRequest
], authController.register);

router.post('/login', [
  emailRule(),
  body('password')
    .isString()
    .isLength({ min: 1, max: 128 })
    .withMessage('Password is required'),
  validateRequest
], authController.login);

router.post('/forgot-password', [
  emailRule(),
  validateRequest
], authController.forgotPassword);

router.put('/reset-password/:token', [
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters'),
  validateRequest
], authController.resetPassword);

router.post('/refresh-token', [
  body('refreshToken')
    .isString()
    .notEmpty()
    .withMessage('Refresh token is required'),
  validateRequest
], authController.refreshToken);

router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
