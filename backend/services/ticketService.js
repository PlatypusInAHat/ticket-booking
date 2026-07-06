const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const ApiError = require('../utils/ApiError');
const { toPublicTicket } = require('../serializers/ticketSerializer');
const { canManageCompany } = require('./companyService');
const {
  buildSort,
  parseBoolean,
  parseDate,
  parsePositiveInt
} = require('../utils/queryUtils');

const getAllTickets = async (query) => {
  const {
    companyId,
    eventId,
    eventType,
    city,
    search,
    status,
    sessionId,
    tag,
    minPrice,
    maxPrice,
    dateFrom,
    dateTo,
    availableOnly,
    sortBy = 'date',
    order = 'asc',
    page = 1,
    limit = 10
  } = query;

  const currentPage = parsePositiveInt(page, 1);
  const pageSize = parsePositiveInt(limit, 10, { min: 1, max: 100 });

  const filter = { isActive: true };

  if (companyId) filter.company = companyId;
  if (eventId) filter.event = eventId;
  if (sessionId) filter.session = sessionId;
  if (eventType) filter.eventType = eventType;
  if (city) filter['location.city'] = city;
  if (status && status !== 'all') filter.status = status;
  if (search) filter.$text = { $search: search };
  if (tag) filter.tags = tag.toLowerCase();
  if (parseBoolean(availableOnly)) {
    filter.availableSeats = { $gt: 0 };
  }

  const fromDate = parseDate(dateFrom);
  const toDate = parseDate(dateTo);
  if (fromDate || toDate) {
    filter.date = {};
    if (fromDate) filter.date.$gte = fromDate;
    if (toDate) filter.date.$lte = toDate;
  }

  const min = Number.parseFloat(minPrice);
  const max = Number.parseFloat(maxPrice);
  if (Number.isFinite(min) || Number.isFinite(max)) {
    filter.price = {};
    if (Number.isFinite(min)) filter.price.$gte = min;
    if (Number.isFinite(max)) filter.price.$lte = max;
  }

  const skip = (currentPage - 1) * pageSize;
  const sort = buildSort(
    sortBy,
    order,
    ['date', 'price', 'availableSeats', 'createdAt', 'soldSeats'],
    'date'
  );

  const tickets = await Ticket.find(filter)
    .populate('company', 'name slug logo status')
    .populate('event', 'title slug eventType coverImage startsAt endsAt status company location')
    .populate('session', 'startsAt endsAt status')
    .skip(skip)
    .limit(pageSize)
    .sort(sort);

  const total = await Ticket.countDocuments(filter);

  return {
    tickets: tickets.map(ticket => toPublicTicket(ticket)),
    pagination: {
      total,
      page: currentPage,
      limit: pageSize,
      pages: Math.ceil(total / pageSize)
    }
  };
};

const getTicketById = async (id) => {
  const ticket = await Ticket.findById(id)
    .populate('company', 'name slug logo contact address description status verification.status')
    .populate('event', 'title slug eventType description coverImage gallery location startsAt endsAt timezone status saleWindow admission policies tags company')
    .populate('session', 'startsAt endsAt status');
  if (!ticket) {
    throw new ApiError(404, 'Ticket not found');
  }
  return toPublicTicket(ticket, { detail: true });
};

const createTicket = async (ticketData, user) => {
  const { eventId, event, eventName, eventType, price, availableSeats, date, location } = ticketData;
  const eventRef = eventId || event;
  let eventDocument = null;

  if (eventRef) {
    eventDocument = await Event.findById(eventRef).populate('company');

    if (!eventDocument) {
      throw new ApiError(404, 'Event not found');
    }

    if (!canManageCompany(eventDocument.company, user)) {
      throw new ApiError(403, 'Not authorized to create tickets for this event');
    }
  }

  const resolvedEventName = eventName || eventDocument?.title;
  const resolvedEventType = eventType || eventDocument?.eventType;
  const resolvedDate = date || eventDocument?.startsAt;
  const resolvedLocation = location || eventDocument?.location;

  if (!resolvedEventName || !resolvedEventType || price == null || availableSeats == null || !resolvedDate) {
    throw new ApiError(400, 'Missing required fields');
  }

  if (!resolvedLocation?.venue || !resolvedLocation?.city) {
    throw new ApiError(400, 'Venue and city are required');
  }

  if (Number(price) < 0 || Number(availableSeats) < 1) {
    throw new ApiError(400, 'Price and available seats must be valid values');
  }

  const ticket = new Ticket({
    ...ticketData,
    event: eventDocument?._id,
    company: eventDocument?.company?._id,
    organizer: user.id,
    eventName: resolvedEventName,
    eventType: resolvedEventType,
    description: ticketData.description ?? eventDocument?.description,
    image: ticketData.image ?? eventDocument?.coverImage,
    location: resolvedLocation,
    date: resolvedDate,
    time: ticketData.time || (
      eventDocument?.startsAt
        ? eventDocument.startsAt.toISOString().slice(11, 16)
        : undefined
    ),
    timezone: ticketData.timezone || eventDocument?.timezone || 'Asia/Ho_Chi_Minh',
    currency: ticketData.currency || eventDocument?.company?.settings?.defaultCurrency || 'VND',
    price: Number(price),
    availableSeats: Number(availableSeats),
    totalSeats: Number(availableSeats),
    ticketName: ticketData.ticketName || ticketData.name || resolvedEventName,
    category: ticketData.category || 'standard',
    ticketType: ticketData.ticketType || ticketData.name || resolvedEventName,
    visibility: ticketData.visibility || 'public'
  });

  await ticket.save();

  if (eventDocument) {
    await Event.findByIdAndUpdate(eventDocument._id, {
      $inc: { 'stats.totalTickets': ticket.totalSeats }
    });
  }

  return ticket;
};

const updateTicket = async (id, updateData, user) => {
  const ticket = await Ticket.findById(id);

  if (!ticket) {
    throw new ApiError(404, 'Ticket not found');
  }

  if (ticket.organizer?.toString() !== user.id && user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to update this ticket');
  }

  const nextAvailableSeats = updateData.availableSeats != null ? Number(updateData.availableSeats) : ticket.availableSeats;

  if (updateData.price != null && Number(updateData.price) < 0) {
    throw new ApiError(400, 'Price must be a positive number');
  }

  if (nextAvailableSeats < 0) {
    throw new ApiError(400, 'Available seats cannot be negative');
  }

  const previousTotalSeats = ticket.totalSeats || 0;

  Object.assign(ticket, {
    ...updateData,
    price: updateData.price != null ? Number(updateData.price) : ticket.price,
    availableSeats: nextAvailableSeats
  });
  ticket.totalSeats = Math.max(ticket.soldSeats + ticket.availableSeats, ticket.totalSeats);
  ticket.updatedAt = new Date();
  
  await ticket.save();

  if (ticket.event && ticket.totalSeats !== previousTotalSeats) {
    await Event.findByIdAndUpdate(ticket.event, {
      $inc: { 'stats.totalTickets': ticket.totalSeats - previousTotalSeats }
    });
  }

  return ticket;
};

const deleteTicket = async (id, user) => {
  const ticket = await Ticket.findById(id);

  if (!ticket) {
    throw new ApiError(404, 'Ticket not found');
  }

  if (ticket.organizer?.toString() !== user.id && user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to delete this ticket');
  }

  await Ticket.findByIdAndDelete(id);

  if (ticket.event) {
    await Event.findByIdAndUpdate(ticket.event, {
      $inc: {
        'stats.totalTickets': -ticket.totalSeats,
        'stats.soldTickets': -ticket.soldSeats
      }
    });
  }
};

module.exports = {
  toPublicTicket,
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket
};
