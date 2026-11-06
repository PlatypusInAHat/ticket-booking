const userService = require('../services/userService');
const { asyncHandler, ApiResponse } = require('@ticket-booking/shared');

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await userService.getUserProfile(req.user.id);
  res.status(200).json(new ApiResponse(200, user));
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateUserProfile(req.user.id, req.body);
  res.status(200).json(new ApiResponse(200, user, 'Profile updated successfully'));
});

module.exports = {
  getUserProfile,
  updateUserProfile
};
