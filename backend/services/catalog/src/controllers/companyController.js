const companyService = require('../services/companyService');
const { asyncHandler, ApiResponse } = require('@ticket-booking/shared');

const getCompanies = asyncHandler(async (req, res) => {
  const companies = await companyService.getCompanies(req.query, req.user);
  res.status(200).json(new ApiResponse(200, companies));
});

const { PUBLIC_CACHE_CONTROL } = require('../middleware/httpCache');

const getCompanyById = asyncHandler(async (req, res) => {
  const { company, isPublic } = await companyService.getCompanyProfile(req.params.id, req.user || null);
  res.set('Cache-Control', isPublic && !req.headers.authorization ? PUBLIC_CACHE_CONTROL : 'private, no-store');
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
