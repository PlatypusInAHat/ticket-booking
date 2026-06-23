const Event = require('../models/Event');
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
  ticketName: ticket.ticketName || '',
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
      normalized.push({ ticketId, quantity, seatCodes });
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
      item.seatCodes.forEach(seatCode => {
        ticket.seatMap.sections.forEach(sec => {
          sec.rows.forEach(row => {
            row.seats.forEach(seat => {
              if (seat.code === seatCode) seat.status = 'available';
            });
          });
        });
      });
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

const reserveTickets = async (tickets = []) => {
  const normalizedTickets = normalizeTicketSelection(tickets);
  const now = new Date();

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
          throw new ApiError(400, 'Some selected seats are no longer available');
        }

        ticketDoc.availableSeats -= item.quantity;
        ticketDoc.soldSeats += item.quantity;
        if (ticketDoc.availableSeats === 0) ticketDoc.status = 'sold_out';
        ticketDoc.updatedAt = new Date();
        
        ticket = await ticketDoc.save();
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
        seatCodes: item.seatCodes,
        snapshot: toSnapshot(ticket)
      };

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

    const ticket = await Ticket.findById(ticketId).select('event');
    if (!ticket?.event) {
      continue;
    }

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
