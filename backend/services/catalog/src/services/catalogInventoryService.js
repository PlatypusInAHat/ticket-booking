const mongoose = require('mongoose');
const Event = require('../models/Event');
const InventoryReservation = require('../models/InventoryReservation');
const InventoryBucket = require('../models/InventoryBucket');
const SeatLock = require('../models/SeatLock');
const Ticket = require('../models/Ticket');
const crypto = require('crypto');
const { ApiError } = require('@ticket-booking/shared');

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
    const seatCodes = Array.isArray(item.seatCodes)
      ? [...new Set(item.seatCodes.map(code => String(code).trim().toUpperCase()).filter(Boolean))]
      : [];
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

const usesBucketInventory = (ticket) => (
  ticket?.seatMap?.mode !== 'reserved_seating' &&
  (ticket?.inventoryMode === 'buckets' || process.env.INVENTORY_BUCKETS_ENABLED === 'true')
);

const getBucketCount = (ticket) => Math.min(
  Math.max(2, Number.parseInt(
    ticket.inventoryBucketCount || process.env.INVENTORY_BUCKET_COUNT || '32',
    10
  )),
  Math.max(2, ticket.totalSeats)
);

const ensureInventoryBuckets = async (ticket) => {
  const bucketCount = getBucketCount(ticket);
  const totalSeats = Math.max(0, Number(ticket.totalSeats || 0));
  const availableSeats = Math.max(0, Math.min(totalSeats, Number(ticket.availableSeats || 0)));
  const baseTotal = Math.floor(totalSeats / bucketCount);
  const totalRemainder = totalSeats % bucketCount;
  const baseAvailable = Math.floor(availableSeats / bucketCount);
  const availableRemainder = availableSeats % bucketCount;

  try {
    await InventoryBucket.bulkWrite(
      Array.from({ length: bucketCount }, (_, bucketIndex) => ({
        updateOne: {
          filter: { ticket: ticket._id, bucketIndex },
          update: {
            $setOnInsert: {
              ticket: ticket._id,
              bucketIndex,
              totalSeats: baseTotal + (bucketIndex < totalRemainder ? 1 : 0),
              availableSeats: baseAvailable + (bucketIndex < availableRemainder ? 1 : 0)
            }
          },
          upsert: true
        }
      })),
      { ordered: false }
    );
  } catch (error) {
    const writeErrors = error.writeErrors || [];
    if (error.code !== 11000 && !writeErrors.every(item => item.code === 11000)) {
      throw error;
    }
  }

  return bucketCount;
};

const reserveFromBuckets = async (ticket, quantity) => {
  const bucketCount = await ensureInventoryBuckets(ticket);
  let remaining = quantity;
  const allocations = [];
  const startIndex = Math.floor(Math.random() * bucketCount);

  const reserveChunk = async (amount, minIndex, maxIndex) => InventoryBucket.findOneAndUpdate(
    {
      ticket: ticket._id,
      bucketIndex: { $gte: minIndex, ...(maxIndex == null ? {} : { $lt: maxIndex }) },
      availableSeats: { $gte: amount }
    },
    { $inc: { availableSeats: -amount } },
    { new: true, sort: { bucketIndex: 1 } }
  );

  while (remaining > 0) {
    const firstAttempt = await reserveChunk(remaining, startIndex, bucketCount) ||
      (startIndex > 0 ? await reserveChunk(remaining, 0, startIndex) : null);
    if (firstAttempt) {
      allocations.push({ bucketIndex: firstAttempt.bucketIndex, quantity: remaining });
      remaining = 0;
      break;
    }

    const singleSeat = await reserveChunk(1, startIndex, bucketCount) ||
      (startIndex > 0 ? await reserveChunk(1, 0, startIndex) : null);
    if (!singleSeat) {
      await releaseFromBuckets(ticket._id, quantity - remaining);
      throw new ApiError(400, `Not enough seats available for ticket ${ticket._id}`);
    }

    allocations.push({ bucketIndex: singleSeat.bucketIndex, quantity: 1 });
    remaining -= 1;
  }

  return allocations;
};

const releaseFromBuckets = async (ticketId, quantity) => {
  let remaining = quantity;
  while (remaining > 0) {
    const released = await InventoryBucket.findOneAndUpdate(
      {
        ticket: ticketId,
        $expr: { $lt: ['$availableSeats', '$totalSeats'] }
      },
      [{
        $set: {
          availableSeats: { $min: ['$totalSeats', { $add: ['$availableSeats', 1] }] }
        }
      }],
      { new: true, sort: { availableSeats: 1, bucketIndex: 1 } }
    );
    if (!released) break;
    remaining -= 1;
  }

  return quantity - remaining;
};

const getInventorySummary = async (ticketId) => {
  if (!mongoose.isValidObjectId(ticketId)) {
    return null;
  }
  const normalizedTicketId = new mongoose.Types.ObjectId(ticketId);
  const [bucketSummary] = await InventoryBucket.aggregate([
    { $match: { ticket: normalizedTicketId } },
    { $group: {
      _id: '$ticket',
      totalSeats: { $sum: '$totalSeats' },
      availableSeats: { $sum: '$availableSeats' }
    } }
  ]);

  if (bucketSummary) {
    return {
      totalSeats: bucketSummary.totalSeats,
      availableSeats: bucketSummary.availableSeats,
      soldSeats: Math.max(0, bucketSummary.totalSeats - bucketSummary.availableSeats),
      source: 'buckets'
    };
  }

  const ticket = await Ticket.findById(ticketId).select('totalSeats availableSeats soldSeats').lean();
  return ticket ? { ...ticket, source: 'ticket' } : null;
};

const releaseSeatLocks = async (ticketId, seatCodes = [], reservationId = '') => {
  if (!ticketId || seatCodes.length === 0) {
    return;
  }

  await SeatLock.updateMany(
    {
      ticket: ticketId,
      seatCode: { $in: seatCodes.map(code => String(code).toUpperCase()) },
      status: 'locked',
      ...(reservationId ? { reservationId } : {})
    },
    {
      $set: {
        status: 'released',
        releasedAt: new Date()
      }
    }
  );
};

const convertSeatLocks = async (ticketId, seatCodes = [], reservationId = '') => {
  if (!ticketId || seatCodes.length === 0) {
    return;
  }

  await SeatLock.updateMany(
    {
      ticket: ticketId,
      seatCode: { $in: seatCodes.map(code => String(code).toUpperCase()) },
      status: 'locked',
      ...(reservationId ? { reservationId } : {})
    },
    {
      $set: {
        status: 'converted',
        convertedAt: new Date()
      }
    }
  );
};

const createSeatLocks = async ({ ticketId, seatCodes = [], userId, expiresAt, reservationId = '' }) => {
  if (!ticketId || seatCodes.length === 0) {
    return [];
  }

  if (!userId) {
    throw new ApiError(400, 'Seat reservations require a user context');
  }

  await SeatLock.updateMany(
    { ticket: ticketId, seatCode: { $in: seatCodes }, status: 'locked', expiresAt: { $lte: new Date() } },
    { $set: { status: 'expired', releasedAt: new Date() } }
  );

  try {
    return await SeatLock.insertMany(
      seatCodes.map(seatCode => ({
        ticket: ticketId,
        seatCode,
        user: userId,
        expiresAt,
        reservationId
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

const claimReservationTransition = async (reservationId, status, { allowConverted = false } = {}) => {
  if (!reservationId) {
    return true;
  }

  const now = new Date();
  const transition = status === 'converted'
    ? { status, convertedAt: now }
    : { status, releasedAt: now };
  const reservation = await InventoryReservation.findOneAndUpdate(
    {
      reservationId,
      status: allowConverted ? { $in: ['active', 'converted'] } : 'active'
    },
    { $set: transition },
    { new: true }
  );

  return Boolean(reservation);
};

const releaseTickets = async (bookingTickets = [], { restoreRevenue = false, reservationId = '', force = false } = {}) => {
  if (!force && !(await claimReservationTransition(reservationId, 'released', {
    allowConverted: restoreRevenue
  }))) {
    return { released: [], skipped: true };
  }

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
      await releaseSeatLocks(ticketId, item.seatCodes, reservationId);
      await markReservedSeats(ticket, item.seatCodes, 'available');
      ticket.availableSeats = Math.min(ticket.totalSeats, ticket.availableSeats + quantity);
      ticket.soldSeats = Math.max(0, ticket.soldSeats - quantity);
      ticket.updatedAt = new Date();
      await ticket.save();
    } else if (usesBucketInventory(ticket)) {
      await releaseFromBuckets(ticketId, quantity);
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

    if (!usesBucketInventory(ticket) && ticket.availableSeats > 0 && ticket.status === 'sold_out') {
      await Ticket.findByIdAndUpdate(ticket._id, { $set: { status: 'published' } });
    }

    const eventStats = usesBucketInventory(ticket) ? {} : { 'stats.soldTickets': -quantity };
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
  const reservationId = options.reservationId || crypto.randomUUID();

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

      if (!usesBucketInventory(ticketDoc) && ticketDoc.availableSeats < item.quantity) {
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
          expiresAt,
          reservationId
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
          await releaseSeatLocks(item.ticketId, item.seatCodes, reservationId);
          throw new ApiError(400, 'Some selected seats are no longer available');
        }

        ticketDoc.availableSeats -= item.quantity;
        ticketDoc.soldSeats += item.quantity;
        if (ticketDoc.availableSeats === 0) ticketDoc.status = 'sold_out';
        ticketDoc.updatedAt = new Date();
        
        try {
          ticket = await ticketDoc.save();
        } catch (error) {
          await releaseSeatLocks(item.ticketId, item.seatCodes, reservationId);
          throw error.name === 'VersionError'
            ? new ApiError(409, 'Some selected seats are no longer available')
            : error;
        }
      } else if (usesBucketInventory(ticketDoc)) {
        await reserveFromBuckets(ticketDoc, item.quantity);
        ticket = ticketDoc;
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

      if (!usesBucketInventory(ticket) && ticket.availableSeats === 0) {
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
      if (!usesBucketInventory(ticket)) {
        await incrementEventStats(ticket.event, { 'stats.soldTickets': item.quantity });
      }
    }
  } catch (error) {
    await releaseTickets(reservedItems, { force: true, reservationId });
    throw error;
  }

  try {
    await InventoryReservation.create({
      reservationId,
      expiresAt
    });
  } catch (error) {
    await releaseTickets(reservedItems, { force: true, reservationId });
    throw error;
  }

  return {
    reservationId,
    items: reservedItems,
    totalAmount: reservedItems.reduce((sum, item) => sum + item.subtotal, 0)
  };
};

const applyRevenue = async (bookingTickets = [], { reservationId = '' } = {}) => {
  if (!(await claimReservationTransition(reservationId, 'converted'))) {
    return { applied: [], skipped: true };
  }

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
    await convertSeatLocks(ticketId, item.seatCodes || [], reservationId);
    await incrementEventStats(ticket.event, { 'stats.revenue': subtotal });
    applied.push({ ticketId, subtotal });
  }

  return { applied };
};

module.exports = {
  applyRevenue,
  ensureInventoryBuckets,
  getInventorySummary,
  normalizeTicketSelection,
  releaseTickets,
  reserveTickets
};
