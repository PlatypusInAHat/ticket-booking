const express = require('express');
const Booking = require('../../models/Booking');
const Payment = require('../../models/Payment');
const internalAuth = require('../../../../../shared/internalAuth');
const { publishDomainEvent } = require('../../../../../shared/domainEventPublisher');
const EVENTS = require('../../../../../shared/domainEvents');
const asyncHandler = require('../../../../../utils/asyncHandler');
const ApiResponse = require('../../../../../utils/ApiResponse');
const ApiError = require('../../../../../utils/ApiError');
const catalogClient = require('../../services/catalogClient');
const { attachTicketSnapshots, serializeBookingForEvent } = require('../../services/bookingService');

const router = express.Router();

router.use(internalAuth);

router.get('/stats', asyncHandler(async (req, res) => {
  const [totalBookings, totalPayments, completedPayments, totalRevenue] = await Promise.all([
    Booking.countDocuments(),
    Payment.countDocuments(),
    Payment.countDocuments({ status: 'completed' }),
    Booking.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ])
  ]);

  res.status(200).json(new ApiResponse(200, {
    totalBookings,
    totalPayments,
    completedPayments,
    totalRevenue: totalRevenue[0]?.total || 0
  }));
}));

router.get('/bookings', asyncHandler(async (req, res) => {
  const bookings = await Booking.find()
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, bookings.map(attachTicketSnapshots)));
}));

const VALID_PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'];

const publishBookingCancellation = async (booking, { restoreRevenue = false, reason = '' } = {}) => {
  const published = await publishDomainEvent(EVENTS.BOOKING_CANCELLED, {
    booking: serializeBookingForEvent(booking),
    bookingId: booking._id.toString(),
    userId: booking.user.toString(),
    restoreRevenue,
    reason
  }, {
    source: 'booking-service'
  });

  if (!published) {
    await catalogClient.releaseTickets(booking.tickets, { restoreRevenue });
  }
};

router.put('/bookings/:id/payment', asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;

  if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
    throw new ApiError(400, 'Invalid payment status');
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new ApiError(404, 'Booking not found');
  }

  const previousPaymentStatus = booking.paymentStatus;
  const previousBookingStatus = booking.bookingStatus;
  const now = new Date();

  if (paymentStatus === previousPaymentStatus) {
    res.status(200).json(new ApiResponse(200, booking));
    return;
  }

  if (paymentStatus === 'pending') {
    throw new ApiError(400, 'Cannot revert a processed booking to pending');
  }

  if (paymentStatus === 'completed' && booking.bookingStatus === 'cancelled') {
    throw new ApiError(409, 'Cancelled bookings cannot be marked as completed');
  }

  if (
    paymentStatus === 'completed' &&
    booking.paymentStatus === 'pending' &&
    booking.expiresAt &&
    booking.expiresAt <= now
  ) {
    throw new ApiError(409, 'Booking hold expired. Please create a new booking.');
  }

  if (paymentStatus === 'failed' && booking.paymentStatus === 'completed') {
    throw new ApiError(400, 'Use refunded status for completed payments');
  }

  if (paymentStatus === 'refunded' && booking.paymentStatus !== 'completed') {
    throw new ApiError(400, 'Only completed payments can be refunded');
  }

  booking.paymentStatus = paymentStatus;

  if (paymentStatus === 'completed') {
    booking.bookingStatus = 'confirmed';
    booking.confirmedAt = booking.confirmedAt || new Date();
    booking.expiresAt = undefined;
  }

  if (paymentStatus === 'refunded') {
    booking.bookingStatus = 'cancelled';
    booking.passes.forEach((pass) => {
      if (pass.status !== 'checked_in') {
        pass.status = 'cancelled';
      }
    });
    booking.refund = {
      amount: booking.totalAmount,
      reason: 'Admin marked booking as refunded',
      processedAt: now
    };
  }

  if (paymentStatus === 'failed') {
    booking.bookingStatus = 'cancelled';
    booking.cancelledAt = booking.cancelledAt || now;
    booking.expiresAt = undefined;
    booking.passes.forEach((pass) => {
      if (pass.status !== 'checked_in') {
        pass.status = 'cancelled';
      }
    });
  }

  booking.statusHistory.push({
    bookingStatus: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    reason: `Admin updated payment status from ${previousPaymentStatus} to ${paymentStatus}`
  });
  booking.updatedAt = now;
  await booking.save();

  if (paymentStatus === 'completed') {
    await publishDomainEvent(EVENTS.PAYMENT_COMPLETED, {
      booking: serializeBookingForEvent(booking),
      bookingId: booking._id.toString(),
      userId: booking.user.toString(),
      payment: {
        provider: 'admin',
        status: 'completed',
        amount: booking.totalAmount,
        currency: booking.currency,
        processedAt: booking.updatedAt
      }
    }, {
      source: 'booking-service'
    });
  }

  if (
    paymentStatus === 'failed' &&
    previousBookingStatus !== 'cancelled' &&
    previousPaymentStatus === 'pending'
  ) {
    await publishBookingCancellation(booking, {
      restoreRevenue: false,
      reason: 'Admin marked payment as failed'
    });
  }

  if (paymentStatus === 'refunded') {
    await publishBookingCancellation(booking, {
      restoreRevenue: true,
      reason: 'Admin marked payment as refunded'
    });
  }

  res.status(200).json(new ApiResponse(200, booking));
}));

module.exports = router;
