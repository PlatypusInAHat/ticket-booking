const Event = require('../models/Event');
const SeatLock = require('../models/SeatLock');
const Ticket = require('../models/Ticket');
const ApiError = require('../utils/ApiError');

const toTicketId = (item = {}) => {
  if (item.ticketId) {
    return item.ticketId;
  }

  if (item.ticket?._id) {
    return item.ticket._id.toString();
  }

  if (item.ticket) {
    return item.ticket.toString();
  }

  return '';
};

const toSnapshot = (ticket) => ({
  ticketName: ticket.ticketName || ticket.name || ticket.ticketType || '',
  eventName: ticket.eventName || '',
  eventType: ticket.eventType || '',
  image: ticket.image || '',
  location: ticket.location,
  date: ticket.date,
  time: ticket.time,
  currency: ticket.currency || 'VND'
});

const normalizeTicketSelection = (tickets = []) => {
  const normalized = [];

  tickets.forEach((item) => {
    const ticketId = toTicketId(item);
    const seatCodes = Array.isArray(item.seatCodes) ? item.seatCodes : [];
    const quantity = seatCodes.length > 0 ? seatCodes.length : Number(item.quantity);

    if (!ticketId || Number.isNaN(quantity) || quantity < 1) {
      return;
    }

    const existingTicket = normalized.find(entry => entry.ticketId === ticketId);
    if (existingTicket) {
      existingTicket.quantity += quantity;
      if (seatCodes.length > 0) {
        existingTicket.seatCodes = [...(existingTicket.seatCodes || []), ...seatCodes];
      }
    } else {
      const normalizedItem = { ticketId, quantity };
      if (seatCodes.length > 0) {
        normalizedItem.seatCodes = seatCodes;
      }
      normalized.push(normalizedItem);
    }
  });

  return normalized;
};

const incrementEventStats = async (eventId, stats = {}) => {
  if (!eventId) {
    return;
  }

  const set = Object.fromEntries(
    Object.entries(stats).map(([path, delta]) => {
      const nextValue = {
        $add: [
          { $ifNull: [`$${path}`, 0] },
          delta
        ]
      };

      return [
        path,
        delta < 0 ? { $max: [0, nextValue] } : nextValue
      ];
    })
  );

  await Event.findByIdAndUpdate(eventId, [
    { $set: set }
  ]);
};

const buildSaleWindowFilter = (now) => ({
  $and: [
    {
      $or: [
        { 'saleWindow.startsAt': { $exists: false } },
        { 'saleWindow.startsAt': null },
        { 'saleWindow.startsAt': { $lte: now } }
      ]
    },
    {
      $or: [
        { 'saleWindow.endsAt': { $exists: false } },
        { 'saleWindow.endsAt': null },
        { 'saleWindow.endsAt': { $gte: now } }
      ]
    }
  ]
});

const releaseSeatLocks = async (ticketId, seatCodes = []) => {
  if (!ticketId || seatCodes.length === 0) {
    return;
  }

  await SeatLock.updateMany(
    {
      ticket: ticketId,
      seatCode: { $in: seatCodes.map(code => String(code).toUpperCase()) },
      status: 'locked'
    },
    {
      $set: {
        status: 'released',
        releasedAt: new Date()
      }
    }
  );
};

const convertSeatLocks = async (ticketId, seatCodes = []) => {
  if (!ticketId || seatCodes.length === 0) {
    return;
  }

  await SeatLock.updateMany(
    {
      ticket: ticketId,
      seatCode: { $in: seatCodes.map(code => String(code).toUpperCase()) },
      status: 'locked'
    },
    {
      $set: {
        status: 'converted',
        convertedAt: new Date()
      }
    }
  );
};

const createSeatLocks = async ({ ticketId, seatCodes = [], userId, expiresAt }) => {
  if (!ticketId || seatCodes.length === 0) {
    return [];
  }

  if (!userId) {
    throw new ApiError(400, 'Seat reservations require a user context');
  }

  try {
    return await SeatLock.insertMany(
      seatCodes.map(seatCode => ({
        ticket: ticketId,
        seatCode,
        user: userId,
        expiresAt
      })),
      { ordered: true }
    );
  } catch (error) {
    if (error.code === 11000 || error.writeErrors?.some(item => item.code === 11000)) {
      throw new ApiError(409, 'Some selected seats are already reserved');
    }

    throw error;
  }
};

const markReservedSeats = async (ticket, seatCodes = [], status) => {
  if (!ticket?.seatMap || ticket.seatMap.mode !== 'reserved_seating' || seatCodes.length === 0) {
    return;
  }

  const normalizedSeatCodes = seatCodes.map(code => String(code).toUpperCase());
  ticket.seatMap.sections.forEach(sec => {
    sec.rows.forEach(row => {
      row.seats.forEach(seat => {
        if (normalizedSeatCodes.includes(seat.code)) {
          seat.status = status;
        }
      });
    });
  });

  ticket.updatedAt = new Date();
  await ticket.save();
};

const releaseTickets = async (bookingTickets = [], { restoreRevenue = false } = {}) => {
  const released = [];

  for (const item of bookingTickets) {
    const ticketId = toTicketId(item);
    const quantity = Number(item.quantity || 0);

    if (!ticketId || quantity < 1) {
      continue;
    }

    let ticket = await Ticket.findById(ticketId);
    if (!ticket) continue;

    if (ticket.seatMap?.mode === 'reserved_seating' && Array.isArray(item.seatCodes)) {
      await releaseSeatLocks(ticketId, item.seatCodes);
      await markReservedSeats(ticket, item.seatCodes, 'available');
      ticket.availableSeats = Math.min(ticket.totalSeats, ticket.availableSeats + quantity);
      ticket.soldSeats = Math.max(0, ticket.soldSeats - quantity);
      ticket.updatedAt = new Date();
      await ticket.save();
    } else {
      ticket = await Ticket.findOneAndUpdate(
        { _id: ticketId },
        [
          {
            $set: {
              availableSeats: {
                $min: ['$totalSeats', { $add: ['$availableSeats', quantity] }]
              },
              soldSeats: {
                $max: [0, { $subtract: ['$soldSeats', quantity] }]
              },
              updatedAt: new Date()
            }
          }
        ],
        { new: true }
      );
    }

    if (!ticket) continue;

    if (ticket.availableSeats > 0 && ticket.status === 'sold_out') {
      await Ticket.findByIdAndUpdate(ticket._id, { $set: { status: 'published' } });
    }

    const eventStats = { 'stats.soldTickets': -quantity };
    if (restoreRevenue) {
      eventStats['stats.revenue'] = -Number(item.subtotal || 0);
    }

    await incrementEventStats(ticket.event, eventStats);
    released.push({ ticketId, quantity, seatCodes: item.seatCodes });
  }

  return { released };
};

const reserveTickets = async (tickets = [], options = {}) => {
  const normalizedTickets = normalizeTicketSelection(tickets);
  const now = new Date();
  const expiresAt = options.expiresAt ? new Date(options.expiresAt) : new Date(now.getTime() + 15 * 60 * 1000);

  if (normalizedTickets.length === 0) {
    throw new ApiError(400, 'Selected tickets are invalid');
  }

  const reservedItems = [];

  try {
    for (const item of normalizedTickets) {
      const policyTicket = await Ticket.findById(item.ticketId)
        .select('policies.maxTicketsPerUser');

      const maxTicketsPerUser = policyTicket?.policies?.maxTicketsPerUser || 10;
      if (!policyTicket || item.quantity > maxTicketsPerUser) {
        throw new ApiError(400, `Ticket ${item.ticketId} allows maximum ${maxTicketsPerUser} tickets per order`);
      }

      let ticket;

      const ticketDoc = await Ticket.findOne({
        _id: item.ticketId,
        isActive: true,
        status: 'published',
        visibility: 'public',
        ...buildSaleWindowFilter(now)
      });

      if (!ticketDoc) {
        throw new ApiError(400, `Ticket ${item.ticketId} is not available`);
      }

      if (ticketDoc.availableSeats < item.quantity) {
        throw new ApiError(400, `Not enough seats available for ticket ${item.ticketId}`);
      }

      if (ticketDoc.seatMap?.mode === 'reserved_seating') {
        if (!item.seatCodes || item.seatCodes.length !== item.quantity) {
          throw new ApiError(400, `Must provide exactly ${item.quantity} seat codes for reserved seating`);
        }

        await createSeatLocks({
          ticketId: item.ticketId,
          seatCodes: item.seatCodes,
          userId: options.userId,
          expiresAt
        });

        let availableCount = 0;
        ticketDoc.seatMap.sections.forEach(sec => {
          sec.rows.forEach(row => {
            row.seats.forEach(seat => {
              if (item.seatCodes.includes(seat.code) && seat.status === 'available') {
                availableCount++;
                seat.status = 'held';
              }
            });
          });
        });

        if (availableCount !== item.quantity) {
          await releaseSeatLocks(item.ticketId, item.seatCodes);
          throw new ApiError(400, 'Some selected seats are no longer available');
        }

        ticketDoc.availableSeats -= item.quantity;
        ticketDoc.soldSeats += item.quantity;
        if (ticketDoc.availableSeats === 0) ticketDoc.status = 'sold_out';
        ticketDoc.updatedAt = new Date();
        
        try {
          ticket = await ticketDoc.save();
        } catch (error) {
          await releaseSeatLocks(item.ticketId, item.seatCodes);
          throw error.name === 'VersionError'
            ? new ApiError(409, 'Some selected seats are no longer available')
            : error;
        }
      } else {
        ticket = await Ticket.findOneAndUpdate(
          {
            _id: item.ticketId,
            isActive: true,
            status: 'published',
            visibility: 'public',
            ...buildSaleWindowFilter(now),
            availableSeats: { $gte: item.quantity }
          },
          {
            $inc: {
              availableSeats: -item.quantity,
              soldSeats: item.quantity
            },
            $set: { updatedAt: new Date() }
          },
          { new: true }
        );
      }

      if (!ticket) {
        throw new ApiError(400, `Not enough seats available for ticket ${item.ticketId}`);
      }

      if (ticket.availableSeats === 0) {
        await Ticket.findByIdAndUpdate(ticket._id, { $set: { status: 'sold_out' } });
      }

      const subtotal = ticket.price * item.quantity;
      const reservedItem = {
        ticket: ticket._id,
        event: ticket.event,
        quantity: item.quantity,
        pricePerUnit: ticket.price,
        subtotal,
        snapshot: toSnapshot(ticket)
      };

      if (item.seatCodes?.length > 0) {
        reservedItem.seatCodes = item.seatCodes;
      }

      reservedItems.push(reservedItem);
      await incrementEventStats(ticket.event, { 'stats.soldTickets': item.quantity });
    }
  } catch (error) {
    await releaseTickets(reservedItems);
    throw error;
  }

  return {
    items: reservedItems,
    totalAmount: reservedItems.reduce((sum, item) => sum + item.subtotal, 0)
  };
};

const applyRevenue = async (bookingTickets = []) => {
  const applied = [];

  for (const item of bookingTickets) {
    const ticketId = toTicketId(item);
    const subtotal = Number(item.subtotal || 0);

    if (!ticketId || subtotal <= 0) {
      continue;
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket?.event) {
      continue;
    }

    await markReservedSeats(ticket, item.seatCodes || [], 'sold');
    await convertSeatLocks(ticketId, item.seatCodes || []);
    await incrementEventStats(ticket.event, { 'stats.revenue': subtotal });
    applied.push({ ticketId, subtotal });
  }

  return { applied };
};

module.exports = {
  applyRevenue,
  normalizeTicketSelection,
  releaseTickets,
  reserveTickets
};
