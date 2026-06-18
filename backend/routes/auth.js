const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validateRequest = require('../middleware/validateRequest');
const router = express.Router();

const emailRule = () => body('email')
  .isEmail()
  .withMessage('Email không hợp lệ')
  .normalizeEmail();

router.post('/register', [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Tên phải có từ 2 đến 100 ký tự'),
  emailRule(),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Mật khẩu phải có từ 8 đến 128 ký tự'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Mật khẩu xác nhận không khớp'),
  validateRequest
], authController.register);

router.post('/login', [
  emailRule(),
  body('password')
    .isString()
    .isLength({ min: 1, max: 128 })
    .withMessage('Mật khẩu là bắt buộc'),
  validateRequest
], authController.login);

router.post('/forgot-password', [
  emailRule(),
  validateRequest
], authController.forgotPassword);

router.put('/reset-password/:token', [
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Mật khẩu phải có từ 8 đến 128 ký tự'),
  validateRequest
], authController.resetPassword);

module.exports = router;
