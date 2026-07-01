const dotenv = require('dotenv');
const express = require('express');
const { subscribeToDomainEvents } = require('../../shared/domainEventSubscriber');
const EVENTS = require('../../shared/domainEvents');
const { sendEmail } = require('../../utils/emailService');

dotenv.config();

const SERVICE_NAME = 'notification-service';
const PORT = process.env.NOTIFICATION_SERVICE_PORT || process.env.PORT || 5105;
let startedAt = new Date();

const startHealthServer = () => {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }

  const app = express();

  app.get('/health', (req, res) => {
    res.json({
      status: 'OK',
      service: SERVICE_NAME,
      uptime: process.uptime(),
      startedAt: startedAt.toISOString(),
      timestamp: new Date().toISOString()
    });
  });

  return app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] health endpoint running on port ${PORT}`);
  });
};

const handlePaymentCompleted = async (payload) => {
  const { booking, payment } = payload;
  
  if (!booking || !booking.user) return;
  
  // Here we assume booking.user contains the user details (name, email)
  // In a real app, you might need to fetch the user if booking.user is just an ID
  const userEmail = booking.user.email || 'customer@example.com';
  const userName = booking.user.name || 'Customer';

  console.log(`[${SERVICE_NAME}] Preparing to send ticket email to ${userEmail} for booking ${booking.bookingNumber}`);

  await sendEmail({
    to: userEmail,
    subject: `Your Ticket Confirmation - ${booking.bookingNumber}`,
    template: 'ticket',
    context: {
      userName,
      bookingNumber: booking.bookingNumber,
      totalAmount: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: booking.currency || 'VND' }).format(payment.amount),
      tickets: booking.tickets.map(t => ({
        eventName: t.eventName,
        quantity: t.quantity,
        price: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: booking.currency || 'VND' }).format(t.price)
      }))
    }
  });
};

const handleUserRegistered = async (payload) => {
  const { user } = payload;
  
  if (!user || !user.email) return;

  console.log(`[${SERVICE_NAME}] Preparing to send welcome email to ${user.email}`);

  await sendEmail({
    to: user.email,
    subject: 'Welcome to TicketStage!',
    template: 'welcome',
    context: {
      userName: user.name || 'Valued Customer'
    }
  });
};

const handlePasswordResetRequested = async (payload) => {
  const { user, resetToken } = payload;
  
  if (!user || !user.email || !resetToken) return;

  console.log(`[${SERVICE_NAME}] Preparing to send reset password email to ${user.email}`);

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Password Reset Request - TicketStage',
    template: 'resetPassword',
    context: {
      userName: user.name || 'User',
      resetUrl
    }
  });
};

const startNotificationService = async () => {
  try {
    startedAt = new Date();
    console.log(`[${SERVICE_NAME}] Starting...`);
    startHealthServer();
    
    await subscribeToDomainEvents({
      group: SERVICE_NAME,
      handlers: {
        [EVENTS.PAYMENT_COMPLETED]: handlePaymentCompleted,
        [EVENTS.USER_REGISTERED]: handleUserRegistered,
        [EVENTS.PASSWORD_RESET_REQUESTED]: handlePasswordResetRequested
      }
    });

    console.log(`[${SERVICE_NAME}] Listening for events...`);
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Failed to start:`, error);
  }
};

if (require.main === module) {
  startNotificationService();
}

module.exports = startNotificationService;
