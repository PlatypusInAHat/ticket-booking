const Company = require('../models/Company');
const ApiError = require('../utils/ApiError');
const {
  buildSort,
  parsePositiveInt
} = require('../utils/queryUtils');

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
  const {
    status,
    verificationStatus,
    search,
    mine,
    sortBy = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 100
  } = query;
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (verificationStatus) {
    filter['verification.status'] = verificationStatus;
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

  const skip = (parsePositiveInt(page, 1) - 1) * parsePositiveInt(limit, 100, { min: 1, max: 100 });
  const sort = buildSort(sortBy, order, ['createdAt', 'name', 'status', 'verification.status'], 'createdAt');

  const [companies, total] = await Promise.all([
    Company.find(filter).sort(sort).skip(skip).limit(parsePositiveInt(limit, 100, { min: 1, max: 100 })),
    Company.countDocuments(filter)
  ]);

  return {
    companies,
    pagination: {
      total,
      page: parsePositiveInt(page, 1),
      limit: parsePositiveInt(limit, 100, { min: 1, max: 100 }),
      pages: Math.ceil(total / parsePositiveInt(limit, 100, { min: 1, max: 100 }))
    }
  };
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
