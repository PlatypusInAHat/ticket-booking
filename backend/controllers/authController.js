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

module.exports = { register, login };
