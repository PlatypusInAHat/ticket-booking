const mongoose = require('mongoose');
const Company = require('../models/Company');
const Event = require('../models/Event');
const EventSession = require('../models/EventSession');
const Ticket = require('../models/Ticket');
const { ApiError, queryUtils } = require('@ticket-booking/shared');
const { canManageCompany } = require('./companyService');
const { buildSort, parseDate, parsePositiveInt } = queryUtils;

// A ticket tier is "sellable" when it is active, published and still has seats
// (same seat semantics as `availableOnly=true` on GET /api/tickets).
const SELLABLE_TICKET_MATCH = Object.freeze({
  isActive: true,
  status: 'published',
  availableSeats: { $gt: 0 }
});

const EMPTY_TICKET_SUMMARY = Object.freeze({
  minPrice: 0,
  maxPrice: 0,
  currency: 'VND',
  remaining: 0,
  tierCount: 0
});

const toObjectId = (value) => {
  if (value instanceof mongoose.Types.ObjectId) return value;
  return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(String(value)) : null;
};

/**
 * Computes ticket summaries for many events with a single aggregation over Ticket.
 * Returns a Map keyed by event id string.
 */
const getTicketSummaries = async (eventIds = []) => {
  const ids = eventIds.map(toObjectId).filter(Boolean);
  const summaries = new Map();

  if (!ids.length) {
    return summaries;
  }

  const rows = await Ticket.aggregate([
    { $match: { event: { $in: ids }, ...SELLABLE_TICKET_MATCH } },
    {
      $group: {
        _id: '$event',
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        currency: { $first: '$currency' },
        remaining: { $sum: '$availableSeats' },
        tierCount: { $sum: 1 }
      }
    }
  ]);

  rows.forEach((row) => {
    summaries.set(String(row._id), {
      minPrice: Number(row.minPrice) || 0,
      maxPrice: Number(row.maxPrice) || 0,
      currency: row.currency || EMPTY_TICKET_SUMMARY.currency,
      remaining: Number(row.remaining) || 0,
      tierCount: Number(row.tierCount) || 0
    });
  });

  return summaries;
};

const withTicketSummary = (event, summaries) => ({
  ...event,
  ticketSummary: summaries.get(String(event._id)) || { ...EMPTY_TICKET_SUMMARY }
});

const getEvents = async (query = {}) => {
  const {
    companyId,
    company,
    eventType,
    city,
    status = 'published',
    search,
    tag,
    startsFrom,
    startsTo,
    endsFrom,
    endsTo,
    sortBy = 'startsAt',
    order = 'asc',
    page = 1,
    limit = 10
  } = query;
  const filter = {};

  const companyFilter = companyId || company;
  if (companyFilter) {
    filter.company = companyFilter;
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

  if (tag) {
    filter.tags = tag.toLowerCase();
  }

  const startFromDate = parseDate(startsFrom);
  const startToDate = parseDate(startsTo);
  const endFromDate = parseDate(endsFrom);
  const endToDate = parseDate(endsTo);

  if (startFromDate || startToDate) {
    filter.startsAt = {};
    if (startFromDate) filter.startsAt.$gte = startFromDate;
    if (startToDate) filter.startsAt.$lte = startToDate;
  }

  if (endFromDate || endToDate) {
    filter.endsAt = {};
    if (endFromDate) filter.endsAt.$gte = endFromDate;
    if (endToDate) filter.endsAt.$lte = endToDate;
  }

  const parsedPage = parsePositiveInt(page, 1);
  const parsedLimit = parsePositiveInt(limit, 10, { min: 1, max: 100 });
  const skip = (parsedPage - 1) * parsedLimit;
  const sort = buildSort(
    sortBy,
    order,
    ['startsAt', 'createdAt', 'title', 'stats.views', 'stats.soldTickets'],
    'startsAt'
  );

  const [events, total] = await Promise.all([
    Event.find(filter)
      .populate('company', 'name slug logo status')
      .skip(skip)
      .limit(parsedLimit)
      .sort(sort)
      .lean(),
    Event.countDocuments(filter)
  ]);

  const summaries = await getTicketSummaries(events.map((event) => event._id));

  return {
    events: events.map((event) => withTicketSummary(event, summaries)),
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      pages: Math.ceil(total / parsedLimit)
    }
  };
};

const getEventById = async (id) => {
  const lookup = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { slug: id };

  const event = await Event.findOne(lookup)
    .populate('company', 'name slug logo contact status')
    .lean();

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  const summaries = await getTicketSummaries([event._id]);
  return withTicketSummary(event, summaries);
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

const createEventBundle = async (bundleData, user) => {
  const { eventData, sessionsData } = bundleData;
  const { companyId, company, title, eventType, location } = eventData;
  const companyRef = companyId || company || user.company; // Assume admin or organizer context
  
  if (!companyRef || !title || !eventType) {
    throw new ApiError(400, 'Company, title, and event type are required');
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

  const sess = await mongoose.startSession();
  sess.startTransaction();

  try {
    // 1. Create Event
    // We need to calculate earliest start and latest end across all sessions
    let earliestStart = null;
    let latestEnd = null;
    
    if (sessionsData && sessionsData.length > 0) {
      sessionsData.forEach(s => {
        const start = new Date(s.startDate);
        const end = new Date(s.endDate);
        if (!earliestStart || start < earliestStart) earliestStart = start;
        if (!latestEnd || end > latestEnd) latestEnd = end;
      });
    }

    const newEvent = new Event({
      ...eventData,
      company: companyRef,
      organizer: user.id,
      startsAt: earliestStart || new Date(),
      endsAt: latestEnd
    });
    
    await newEvent.save({ session: sess });

    // 2. Create Sessions and Tickets
    let totalTickets = 0;

    if (sessionsData && sessionsData.length > 0) {
      for (const sessionItem of sessionsData) {
        const sessionStartsAt = new Date(sessionItem.startDate);
        const sessionEndsAt = new Date(sessionItem.endDate);
        const newSession = new EventSession({
          event: newEvent._id,
          startsAt: sessionStartsAt,
          endsAt: sessionEndsAt
        });
        await newSession.save({ session: sess });

        // 3. Create Tickets for this session
        if (sessionItem.ticketTypes && sessionItem.ticketTypes.length > 0) {
          const ticketsToCreate = sessionItem.ticketTypes.map(t => {
            const totalSeats = Number(t.totalQuantity);

            if (!Number.isFinite(totalSeats) || totalSeats < 1) {
              throw new ApiError(400, `Ticket quantity is invalid for ${t.name || 'unnamed ticket'}`);
            }

            totalTickets += totalSeats;

            return {
              event: newEvent._id,
              session: newSession._id,
              company: companyDocument._id,
              organizer: user.id,
              name: t.name,
              ticketName: t.name,
              eventName: title,
              eventType,
              ticketType: t.ticketType || t.name,
              category: t.category || 'standard',
              location,
              date: sessionStartsAt,
              time: sessionStartsAt.toISOString().slice(11, 16),
              timezone: eventData.timezone || 'Asia/Ho_Chi_Minh',
              currency: eventData.currency || companyDocument.settings?.defaultCurrency || 'VND',
              price: t.isFree ? 0 : Number(t.price),
              isFree: Boolean(t.isFree),
              totalSeats,
              availableSeats: totalSeats,
              description: t.description || eventData.description || '',
              image: t.image || eventData.coverImage || '',
              tags: t.tags || eventData.tags || [],
              saleWindow: {
                startsAt: t.saleStart ? new Date(t.saleStart) : null,
                endsAt: t.saleEnd ? new Date(t.saleEnd) : null
              },
              policies: {
                maxTicketsPerUser: t.maxPerOrder,
                minTicketsPerUser: t.minPerOrder
              },
              seatMap: t.seatMap || { mode: 'general_admission', sections: [] }
            };
          });

          await Ticket.insertMany(ticketsToCreate, { session: sess });
        }
      }
    }

    if (totalTickets > 0) {
      await Event.updateOne(
        { _id: newEvent._id },
        { $inc: { 'stats.totalTickets': totalTickets } },
        { session: sess }
      );
      newEvent.stats.totalTickets = totalTickets;
    }

    await sess.commitTransaction();
    sess.endSession();

    return newEvent;
  } catch (error) {
    await sess.abortTransaction();
    sess.endSession();
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(500, 'Failed to create event bundle: ' + error.message);
  }
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

const deleteEvent = async (id, user) => {
  const event = await Event.findById(id).populate('company');

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  if (!canManageCompany(event.company, user)) {
    throw new ApiError(403, 'Not authorized to delete this event');
  }

  const sess = await mongoose.startSession();
  sess.startTransaction();

  try {
    await Ticket.deleteMany({ event: event._id }, { session: sess });
    await EventSession.deleteMany({ event: event._id }, { session: sess });
    await Event.deleteOne({ _id: event._id }, { session: sess });

    await sess.commitTransaction();
    sess.endSession();
  } catch (error) {
    await sess.abortTransaction();
    sess.endSession();
    throw new ApiError(500, 'Failed to delete event: ' + error.message);
  }
};

module.exports = {
  EMPTY_TICKET_SUMMARY,
  SELLABLE_TICKET_MATCH,
  getTicketSummaries,
  getEvents,
  getEventById,
  createEvent,
  createEventBundle,
  updateEvent,
  deleteEvent
};
