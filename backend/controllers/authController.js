const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  
  res.status(201).json(
    new ApiResponse(201, data, 'User registered successfully')
  );
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const data = await authService.login(email, password);
  
  res.status(200).json(
    new ApiResponse(200, data, 'Login successful')
  );
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const data = await authService.forgotPassword(email);

  res.status(200).json(
    new ApiResponse(200, data, 'Reset email sent')
  );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  const data = await authService.resetPassword(token, password);

  res.status(200).json(
    new ApiResponse(200, data, 'Password reset successful')
  );
});

module.exports = { register, login, forgotPassword, resetPassword };
