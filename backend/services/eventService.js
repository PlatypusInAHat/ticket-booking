const Company = require('../models/Company');
const Event = require('../models/Event');
const ApiError = require('../utils/ApiError');
const { canManageCompany } = require('./companyService');

const getEvents = async (query = {}) => {
  const { companyId, eventType, city, status = 'published', search, page = 1, limit = 10 } = query;
  const filter = {};

  if (companyId) {
    filter.company = companyId;
  }

  if (eventType) {
    filter.eventType = eventType;
  }

  if (city) {
    filter['location.city'] = city;
  }

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);
  const skip = (parsedPage - 1) * parsedLimit;

  const [events, total] = await Promise.all([
    Event.find(filter)
      .populate('company', 'name slug logo status')
      .skip(skip)
      .limit(parsedLimit)
      .sort({ startsAt: 1 }),
    Event.countDocuments(filter)
  ]);

  return {
    events,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      pages: Math.ceil(total / parsedLimit)
    }
  };
};

const getEventById = async (id) => {
  const event = await Event.findById(id)
    .populate('company', 'name slug logo contact status');

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  return event;
};

const createEvent = async (eventData, user) => {
  const { companyId, company, title, eventType, startsAt, location } = eventData;
  const companyRef = companyId || company;

  if (!companyRef || !title || !eventType || !startsAt) {
    throw new ApiError(400, 'Company, title, event type and start date are required');
  }

  if (!location?.venue || !location?.city) {
    throw new ApiError(400, 'Venue and city are required');
  }

  const companyDocument = await Company.findById(companyRef);
  if (!companyDocument) {
    throw new ApiError(404, 'Company not found');
  }

  if (!canManageCompany(companyDocument, user)) {
    throw new ApiError(403, 'Not authorized to create events for this company');
  }

  const event = new Event({
    ...eventData,
    company: companyDocument._id,
    organizer: user.id,
    startsAt: new Date(startsAt),
    endsAt: eventData.endsAt ? new Date(eventData.endsAt) : undefined
  });

  await event.save();
  return event;
};

const updateEvent = async (id, updateData, user) => {
  const event = await Event.findById(id).populate('company');

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  if (!canManageCompany(event.company, user)) {
    throw new ApiError(403, 'Not authorized to update this event');
  }

  Object.assign(event, updateData);
  await event.save();
  return event;
};

module.exports = {
  createEvent,
  getEventById,
  getEvents,
  updateEvent
};
