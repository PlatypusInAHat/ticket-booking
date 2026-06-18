const Company = require('../models/Company');
const ApiError = require('../utils/ApiError');

const canManageCompany = (company, user) => {
  if (!company || !user) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  if (company.owner?.toString() === user.id) {
    return true;
  }

  return company.members?.some((member) => {
    return member.user?.toString() === user.id && ['owner', 'manager'].includes(member.role);
  });
};

const getCompanies = async (query = {}, user = null) => {
  const { status, search, mine } = query;
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (search) {
    filter.$text = { $search: search };
  }

  if (mine === 'true' && user) {
    filter.$or = [
      { owner: user.id },
      { 'members.user': user.id }
    ];
  }

  return Company.find(filter).sort({ createdAt: -1 });
};

const getCompanyById = async (id) => {
  const company = await Company.findById(id);

  if (!company) {
    throw new ApiError(404, 'Company not found');
  }

  return company;
};

const createCompany = async (companyData, user) => {
  const { name } = companyData;

  if (!name) {
    throw new ApiError(400, 'Company name is required');
  }

  const company = new Company({
    ...companyData,
    owner: user.id
  });

  await company.save();
  return company;
};

const updateCompany = async (id, updateData, user) => {
  const company = await Company.findById(id);

  if (!company) {
    throw new ApiError(404, 'Company not found');
  }

  if (!canManageCompany(company, user)) {
    throw new ApiError(403, 'Not authorized to update this company');
  }

  Object.assign(company, updateData);
  await company.save();
  return company;
};

module.exports = {
  canManageCompany,
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany
};
