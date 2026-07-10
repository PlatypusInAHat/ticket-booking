const authService = require('../services/authService');
const { asyncHandler, ApiResponse } = require('@ticket-booking/shared');

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

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const data = await authService.refreshAuthToken(refreshToken);

  res.status(200).json(
    new ApiResponse(200, data, 'Token refreshed successfully')
  );
});

const logout = asyncHandler(async (req, res) => {
  const data = await authService.logout(req.user.id);

  res.status(200).json(
    new ApiResponse(200, data, 'Logout successful')
  );
});

module.exports = { register, login, refreshToken, forgotPassword, resetPassword, logout };
