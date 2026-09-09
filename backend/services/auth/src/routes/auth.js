const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validateRequest = require('../../../../middleware/validateRequest');
const { authenticateToken } = require('../../../../middleware/auth');
const { createEnvRateLimiter } = require('../../../../middleware/rateLimit');
const router = express.Router();

const loginLimiter = createEnvRateLimiter({
  name: 'auth-login',
  windowEnv: 'AUTH_LOGIN_RATE_LIMIT_WINDOW_MS',
  maxEnv: 'AUTH_LOGIN_RATE_LIMIT_MAX',
  defaultWindowMs: 15 * 60 * 1000,
  defaultMax: 10,
  message: 'Too many login attempts. Please try again later.'
});

const forgotPasswordLimiter = createEnvRateLimiter({
  name: 'auth-forgot-password',
  windowEnv: 'AUTH_FORGOT_RATE_LIMIT_WINDOW_MS',
  maxEnv: 'AUTH_FORGOT_RATE_LIMIT_MAX',
  defaultWindowMs: 60 * 60 * 1000,
  defaultMax: 5,
  message: 'Too many password reset requests. Please try again later.'
});

const refreshLimiter = createEnvRateLimiter({
  name: 'auth-refresh-token',
  windowEnv: 'AUTH_REFRESH_RATE_LIMIT_WINDOW_MS',
  maxEnv: 'AUTH_REFRESH_RATE_LIMIT_MAX',
  defaultWindowMs: 60 * 1000,
  defaultMax: 30,
  message: 'Too many token refresh requests. Please try again later.'
});

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
  loginLimiter,
  emailRule(),
  body('password')
    .isString()
    .isLength({ min: 1, max: 128 })
    .withMessage('Password is required'),
  validateRequest
], authController.login);

router.post('/forgot-password', [
  forgotPasswordLimiter,
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
  refreshLimiter,
  body('refreshToken')
    .isString()
    .notEmpty()
    .withMessage('Refresh token is required'),
  validateRequest
], authController.refreshToken);

router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
