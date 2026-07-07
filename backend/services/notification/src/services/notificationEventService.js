const { enqueueEmail } = require('./emailQueueService');

const DEFAULT_CURRENCY = 'VND';

const formatCurrency = (amount = 0, currency = DEFAULT_CURRENCY) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || DEFAULT_CURRENCY,
    maximumFractionDigits: currency === 'VND' ? 0 : 2
  }).format(Number(amount || 0));
};

const getCustomer = (booking = {}) => {
  const customerInfo = booking.customerInfo || {};
  const user = booking.user || {};

  return {
    name: customerInfo.name || user.name || 'Customer',
    email: customerInfo.email || user.email || '',
    phone: customerInfo.phone || ''
  };
};

const mapTicketRows = (booking = {}) => {
  return (booking.tickets || []).map((item) => ({
    eventName: item.snapshot?.eventName || item.eventName || item.ticketName || 'TicketStage event',
    ticketName: item.snapshot?.ticketName || item.ticketName || 'Ticket',
    quantity: item.quantity,
    price: formatCurrency(item.pricePerUnit || item.price || 0, item.snapshot?.currency || booking.currency),
    subtotal: formatCurrency(item.subtotal || 0, item.snapshot?.currency || booking.currency),
    date: item.snapshot?.date ? new Date(item.snapshot.date).toLocaleString('en-US') : '',
    venue: item.snapshot?.location?.venue || ''
  }));
};

const enqueueWelcomeEmail = async ({ user = {} }) => {
  if (!user.email) {
    return null;
  }

  return enqueueEmail({
    to: user.email,
    user: user.id,
    type: 'transactional',
    category: 'welcome',
    subject: 'Welcome to TicketStage',
    template: 'welcome',
    context: {
      userName: user.name || 'Customer',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
    },
    idempotencyKey: `welcome:${user.id || user.email}`,
    sourceEvent: 'user.registered'
  });
};

const enqueuePasswordResetEmail = async ({ user = {}, resetToken }) => {
  if (!user.email || !resetToken) {
    return null;
  }

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  return enqueueEmail({
    to: user.email,
    user: user.id,
    type: 'transactional',
    category: 'password_reset',
    subject: 'Reset your TicketStage password',
    template: 'resetPassword',
    context: {
      userName: user.name || 'Customer',
      resetUrl
    },
    priority: 10,
    maxAttempts: 5,
    idempotencyKey: `password-reset:${resetToken}`,
    sourceEvent: 'password.reset_requested'
  });
};

const enqueuePaymentCompletedEmail = async ({ booking = {}, payment = {} }) => {
  const customer = getCustomer(booking);

  if (!customer.email) {
    return null;
  }

  return enqueueEmail({
    to: customer.email,
    user: booking.user,
    type: 'transactional',
    category: 'purchase_success',
    subject: `Your TicketStage booking is confirmed - ${booking.bookingNumber}`,
    template: 'ticket',
    context: {
      userName: customer.name,
      bookingNumber: booking.bookingNumber,
      totalAmount: formatCurrency(payment.amount || booking.totalAmount, payment.currency || booking.currency),
      tickets: mapTicketRows(booking),
      passes: booking.passes || [],
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
    },
    priority: 9,
    maxAttempts: 5,
    idempotencyKey: `purchase-success:${booking._id || booking.id || booking.bookingNumber}`,
    sourceEvent: 'payment.completed',
    metadata: {
      bookingId: booking._id || booking.id,
      bookingNumber: booking.bookingNumber,
      paymentId: payment.id
    }
  });
};

const enqueueBookingCancelledEmail = async ({ booking = {}, reason = '' }) => {
  const customer = getCustomer(booking);

  if (!customer.email) {
    return null;
  }

  return enqueueEmail({
    to: customer.email,
    user: booking.user,
    type: 'transactional',
    category: 'booking_cancelled',
    subject: `Your TicketStage booking was cancelled - ${booking.bookingNumber}`,
    template: 'bookingCancelled',
    context: {
      userName: customer.name,
      bookingNumber: booking.bookingNumber,
      reason: reason || 'The booking is no longer active.',
      tickets: mapTicketRows(booking)
    },
    idempotencyKey: `booking-cancelled:${booking._id || booking.id || booking.bookingNumber}`,
    sourceEvent: 'booking.cancelled'
  });
};

const enqueueEventReminderEmail = async ({ booking = {}, event = {}, reminderWindowHours = 24 }) => {
  const customer = getCustomer(booking);

  if (!customer.email) {
    return null;
  }

  const eventName = event.title || event.eventName || mapTicketRows(booking)[0]?.eventName || 'your event';

  return enqueueEmail({
    to: customer.email,
    user: booking.user,
    type: 'reminder',
    category: 'event_reminder',
    subject: `${eventName} is coming up soon`,
    template: 'eventReminder',
    context: {
      userName: customer.name,
      eventName,
      startsAt: event.startsAt ? new Date(event.startsAt).toLocaleString('en-US') : '',
      venue: event.location?.venue || '',
      address: event.location?.address || '',
      bookingNumber: booking.bookingNumber,
      reminderWindowHours
    },
    idempotencyKey: `event-reminder:${booking._id || booking.id}:${event.id || eventName}:${reminderWindowHours}`,
    sourceEvent: 'event.reminder_due',
    metadata: {
      bookingId: booking._id || booking.id,
      eventId: event.id
    }
  });
};

module.exports = {
  enqueueBookingCancelledEmail,
  enqueueEventReminderEmail,
  enqueuePasswordResetEmail,
  enqueuePaymentCompletedEmail,
  enqueueWelcomeEmail,
  formatCurrency,
  getCustomer,
  mapTicketRows
};
