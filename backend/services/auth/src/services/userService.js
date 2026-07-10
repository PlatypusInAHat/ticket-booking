const User = require('../models/User');
const { ApiError } = require('@ticket-booking/shared');

const getUserProfile = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

const updateUserProfile = async (userId, updateData) => {
  const { name, phone, address } = updateData;

  const user = await User.findByIdAndUpdate(
    userId,
    { name, phone, address, updatedAt: new Date() },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
};

module.exports = {
  getUserProfile,
  updateUserProfile
};
