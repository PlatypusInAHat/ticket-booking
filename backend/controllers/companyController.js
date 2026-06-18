const companyService = require('../services/companyService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const getCompanies = asyncHandler(async (req, res) => {
  const companies = await companyService.getCompanies(req.query, req.user);
  res.status(200).json(new ApiResponse(200, companies));
});

const getCompanyById = asyncHandler(async (req, res) => {
  const company = await companyService.getCompanyById(req.params.id);
  res.status(200).json(new ApiResponse(200, company));
});

const createCompany = asyncHandler(async (req, res) => {
  const company = await companyService.createCompany(req.body, req.user);
  res.status(201).json(new ApiResponse(201, company, 'Company created successfully'));
});

const updateCompany = asyncHandler(async (req, res) => {
  const company = await companyService.updateCompany(req.params.id, req.body, req.user);
  res.status(200).json(new ApiResponse(200, company, 'Company updated successfully'));
});

module.exports = {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany
};
