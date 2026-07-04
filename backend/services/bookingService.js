const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const ApiError = require('../utils/ApiError');
const { buildPassSecrets, generatePassCode } = require('../utils/passUtils');
const catalogClient = require('./catalogClient');
const { publishDomainEvent } = require('../shared/domainEventPublisher');
const EVENTS = require('../shared/domainEvents');
const {
  escapeRegex,
  buildSort,
  parseDate,
  parsePositiveInt
} = require('../utils/queryUtils');

const DEFAULT_BOOKING_HOLD_MINUTES = 15;

const getBookingHoldMinutes = () => {
  const value = Number.parseInt(process.env.BOOKING_HOLD_MINUTES || '', 10);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_BOOKING_HOLD_MINUTES;
};

const getBookingExpiryDate = () => {
  return new Date(Date.now() + getBookingHoldMinutes() * 60 * 1000);
};

const isExpiredPendingBooking = (booking, now = new Date()) => {
  return Boolean(
    booking &&
    booking.bookingStatus === 'pending' &&
    booking.paymentStatus === 'pending' &&
    booking.expiresAt &&
    booking.expiresAt <= now
  );
};

const createAdmissionPasses = (bookingTickets, holder = {}) => {
  const passes = [];

  bookingTickets.forEach((item) => {
    const seatCodes = Array.isArray(item.seatCodes) ? item.seatCodes : [];
    
    for (let index = 0; index < item.quantity; index += 1) {
      const passCode = generatePassCode();
      const passSecrets = buildPassSecrets(passCode);
      const seatCode = seatCodes[index] || '';
      
      const passObj = {
        ticket: item.ticket,
        passCode,
        barcodeValue: passCode,
        nfcPayloadHash: passSecrets.nfcPayloadHash,
        scanTokenHash: passSecrets.scanTokenHash,
        secretVersion: passSecrets.secretVersion,
        holder: {
          name: holder.name || '',
          email: holder.email || '',
          phone: holder.phone || ''
        },
        status: 'issued'
      };

      if (seatCode) {
        passObj.seat = {
          code: seatCode,
          section: '', // Optional: can parse section from code if formatted like "VIP-A1"
          row: '',
          number: ''
        };
      }

      passes.push(passObj);
    }
  });

  return passes;
};

const serializeBookingForEvent = (booking) => {
  if (typeof booking.toObject === 'function') {
    return booking.toObject({ depopulate: true });
  }

  return booking;
};

const attachTicketSnapshots = (booking) => {
  const plainBooking = typeof booking.toObject === 'function'
    ? booking.toObject()
    : booking;
  const snapshotsByTicketId = new Map(
    (plainBooking.tickets || []).map((item) => [
      item.ticket?.toString?.() || String(item.ticket),
      item.snapshot || {}
    ])
  );

  plainBooking.passes = (plainBooking.passes || []).map((pass) => ({
    ...pass,
    ticketSnapshot: snapshotsByTicketId.get(pass.ticket?.toString?.() || String(pass.ticket)) || {}
  }));

  return plainBooking;
};

const publishBookingCreated = async (booking, options = {}) => {
  const payload = {
    booking: serializeBookingForEvent(booking),
    bookingId: booking._id.toString(),
    userId: booking.user.toString()
  };

  await publishDomainEvent(EVENTS.BOOKING_CREATED, payload, {
    source: 'booking-service',
    session: options.session
  });
};

const publishBookingReleased = async (eventType, booking, extraPayload = {}, options = {}) => {
  const payload = {
    booking: serializeBookingForEvent(booking),
    bookingId: booking._id.toString(),
    userId: booking.user.toString(),
    restoreRevenue: false,
    ...extraPayload
  };

  const published = await publishDomainEvent(eventType, payload, {
    source: 'booking-service',
    session: options.session
  });

  if (!published) {
    await catalogClient.releaseTickets(booking.tickets, {
      restoreRevenue: false
    });
  }

  return published;
};

const createBooking = async (bookingData, user) => {
  const {
    tickets,
    paymentMethod,
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    currency = 'VND',
    source = 'web',
    promoCode = ''
  } = bookingData;

  if (!tickets || tickets.length === 0) {
    throw new ApiError(400, 'No tickets selected');
  }

  const expiresAt = getBookingExpiryDate();
  const reservation = await catalogClient.reserveTickets(tickets, {
    userId: user.id,
    expiresAt
  });
  const bookingTickets = reservation.items.map((item) => ({
    ticket: item.ticket,
    quantity: item.quantity,
    pricePerUnit: item.pricePerUnit,
    subtotal: item.subtotal,
    seatCodes: item.seatCodes || [],
    snapshot: item.snapshot
  }));

  const totalAmount = reservation.totalAmount;
  const customerInfo = {
    name: customerName || '',
    email: customerEmail || '',
    phone: customerPhone || '',
    address: customerAddress || ''
  };

  const booking = new Booking({
    user: user.id,
    tickets: bookingTickets,
    passes: createAdmissionPasses(bookingTickets, customerInfo),
    totalAmount,
    currency,
    pricing: {
      subtotal: totalAmount,
      discount: 0,
      tax: 0,
      serviceFee: 0,
      grandTotal: totalAmount,
      promoCode
    },
    paymentMethod,
    bookingStatus: 'pending',
    paymentStatus: 'pending',
    source,
    expiresAt,
    statusHistory: [{
      bookingStatus: 'pending',
      paymentStatus: 'pending',
      changedBy: user.id,
      reason: `Booking created. Inventory is held for ${getBookingHoldMinutes()} minutes.`
    }],
    customerInfo
  });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await booking.save({ session });
    await publishBookingCreated(booking, { session });
    await session.commitTransaction();
    return booking;
  } catch (error) {
    await session.abortTransaction();
    await catalogClient.releaseTickets(bookingTickets);
    throw error;
  } finally {
    session.endSession();
  }
};

const expirePendingBooking = async (bookingId, options = {}) => {
  const now = options.now || new Date();
  const reason = options.reason || 'Booking hold expired before payment';

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findOneAndUpdate(
      {
        _id: bookingId,
        bookingStatus: 'pending',
        paymentStatus: 'pending',
        expiresAt: { $lte: now }
      },
      {
        $set: {
          bookingStatus: 'cancelled',
          paymentStatus: 'failed',
          cancelledAt: now,
          updatedAt: now,
          'passes.$[pass].status': 'cancelled'
        },
        $unset: {
          expiresAt: ''
        },
        $push: {
          statusHistory: {
            bookingStatus: 'cancelled',
            paymentStatus: 'failed',
            reason,
            changedAt: now
          }
        }
      },
      {
        new: true,
        arrayFilters: [{ 'pass.status': { $ne: 'checked_in' } }],
        session
      }
    );

    if (!booking) {
      await session.abortTransaction();
      return null;
    }

    await publishBookingReleased(EVENTS.BOOKING_EXPIRED, booking, {
      reason
    }, { session });

    await session.commitTransaction();
    return booking;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const expirePendingBookings = async (options = {}) => {
  const now = options.now || new Date();
  const limit = Math.max(1, Number.parseInt(options.limit || process.env.BOOKING_EXPIRATION_BATCH_SIZE || '50', 10));
  const expiredBookings = await Booking.find({
    bookingStatus: 'pending',
    paymentStatus: 'pending',
    expiresAt: { $lte: now }
  })
    .select('_id')
    .sort({ expiresAt: 1 })
    .limit(limit);

  let expiredCount = 0;

  for (const booking of expiredBookings) {
    const expiredBooking = await expirePendingBooking(booking._id, { now });
    if (expiredBooking) {
      expiredCount += 1;
    }
  }

  return {
    expiredCount,
    checkedCount: expiredBookings.length
  };
};

const getUserBookings = async (userId, query = {}) => {
  const {
    bookingStatus,
    paymentStatus,
    paymentMethod,
    source,
    search,
    dateFrom,
    dateTo,
    sortBy = 'createdAt',
    order = 'desc',
    page = 1,
    limit = 20
  } = query;

  const filter = { user: userId };

  if (bookingStatus && bookingStatus !== 'all') filter.bookingStatus = bookingStatus;
  if (paymentStatus && paymentStatus !== 'all') filter.paymentStatus = paymentStatus;
  if (paymentMethod && paymentMethod !== 'all') filter.paymentMethod = paymentMethod;
  if (source && source !== 'all') filter.source = source;
  if (search) {
    const escapedSearch = escapeRegex(search);
    filter.$or = [
      { bookingNumber: { $regex: escapedSearch, $options: 'i' } },
      { 'customerInfo.name': { $regex: escapedSearch, $options: 'i' } },
      { 'customerInfo.email': { $regex: escapedSearch, $options: 'i' } }
    ];
  }

  const fromDate = parseDate(dateFrom);
  const toDate = parseDate(dateTo);
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = fromDate;
    if (toDate) filter.createdAt.$lte = toDate;
  }

  const currentPage = parsePositiveInt(page, 1);
  const pageSize = parsePositiveInt(limit, 20, { min: 1, max: 100 });
  const skip = (currentPage - 1) * pageSize;
  const sort = buildSort(sortBy, order, ['createdAt', 'updatedAt', 'totalAmount', 'bookingNumber'], 'createdAt');

  const [bookings, total] = await Promise.all([
    Booking.find(filter).sort(sort).skip(skip).limit(pageSize),
    Booking.countDocuments(filter)
  ]);

  return {
    bookings: bookings.map(attachTicketSnapshots),
    pagination: {
      total,
      page: currentPage,
      limit: pageSize,
      pages: Math.ceil(total / pageSize)
    }
  };
};

const getBookingById = async (id, user) => {
  const booking = await Booking.findById(id);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (booking.user.toString() !== user.id && user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to view this booking');
  }

  return attachTicketSnapshots(booking);
};

const cancelBooking = async (id, user) => {
  const booking = await Booking.findById(id);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  if (booking.user.toString() !== user.id && user.role !== 'admin') {
    throw new ApiError(403, 'Not authorized to cancel this booking');
  }

  if (booking.bookingStatus === 'cancelled') {
    throw new ApiError(400, 'Booking already cancelled');
  }

  if (booking.paymentStatus === 'failed') {
    throw new ApiError(400, 'Failed bookings cannot be cancelled again');
  }

  const previousPaymentStatus = booking.paymentStatus;

  booking.bookingStatus = 'cancelled';
  booking.cancelledAt = new Date();
  booking.passes.forEach((pass) => {
    if (pass.status !== 'checked_in') {
      pass.status = 'cancelled';
    }
  });

  if (previousPaymentStatus === 'completed') {
    booking.paymentStatus = 'refunded';
    booking.refund = {
      amount: booking.totalAmount,
      reason: 'Booking cancelled after payment completed',
      processedAt: new Date(),
      processedBy: user.id
    };
  }

  if (previousPaymentStatus === 'pending') {
    booking.paymentStatus = 'failed';
    booking.expiresAt = undefined;
  }

  booking.statusHistory.push({
    bookingStatus: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    changedBy: user.id,
    reason: 'Booking cancelled'
  });
  booking.updatedAt = new Date();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await booking.save({ session });

    const payload = {
      booking: serializeBookingForEvent(booking),
      bookingId: booking._id.toString(),
      userId: booking.user.toString(),
      previousPaymentStatus,
      restoreRevenue: previousPaymentStatus === 'completed'
    };

    const published = await publishDomainEvent(EVENTS.BOOKING_CANCELLED, payload, {
      source: 'booking-service',
      session
    });

    if (!published) {
      await catalogClient.releaseTickets(booking.tickets, {
        restoreRevenue: previousPaymentStatus === 'completed'
      });
    }

    await session.commitTransaction();
    return booking;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  attachTicketSnapshots,
  createBooking,
  expirePendingBooking,
  expirePendingBookings,
  getUserBookings,
  getBookingById,
  getBookingHoldMinutes,
  getBookingExpiryDate,
  isExpiredPendingBooking,
  cancelBooking,
  serializeBookingForEvent
};
