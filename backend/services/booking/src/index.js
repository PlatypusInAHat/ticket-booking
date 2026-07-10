module.exports = {
  routes: {
    bookings: require('./routes/bookings'),
    payment: require('./routes/payment'),
    internalBooking: require('./routes/internal/booking')
  },
  services: {
    booking: require('./services/bookingService'),
    payment: require('./services/paymentService'),
    pass: require('./services/passService'),
    queue: require('./services/purchaseQueue'),
    bookingExpiration: require('./services/bookingExpirationService'),
    eventReminder: require('./services/eventReminderService'),
    purchaseLimit: require('./services/purchaseLimitService')
  },
  models: {
    Booking: require('./models/Booking'),
    Payment: require('./models/Payment'),
    QueueSlot: require('./models/QueueSlot')
  }
};
