const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const ApiError = require('../utils/ApiError');
const { toPublicTicket } = require('../serializers/ticketSerializer');
const { canManageCompany } = require('./companyService');

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getAllTickets = async (query) => {
  const { companyId, eventId, eventType, city, search, page = 1, limit = 10 } = query;
  const currentPage = toPositiveInteger(page, 1);
  const pageSize = toPositiveInteger(limit, 10);

  const filter = { isActive: true };

  if (companyId) filter.company = companyId;
  if (eventId) filter.event = eventId;
  if (eventType) filter.eventType = eventType;
  if (city) filter['location.city'] = city;
  if (search) {
    filter.$text = { $search: search };
  }

  const skip = (currentPage - 1) * pageSize;

  const tickets = await Ticket.find(filter)
    .populate('company', 'name slug logo status')
    .populate('event', 'title slug eventType coverImage startsAt endsAt status company')
    .skip(skip)
    .limit(pageSize)
    .sort({ date: 1 });

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
    .populate('event', 'title slug eventType description coverImage gallery location startsAt endsAt timezone status saleWindow admission policies tags company');
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
    currency: ticketData.currency || eventDocument?.company?.settings?.defaultCurrency || 'VND',
    price: Number(price),
    availableSeats: Number(availableSeats),
    totalSeats: Number(availableSeats),
    organizer: user.id
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
