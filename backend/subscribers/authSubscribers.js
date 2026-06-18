const User = require('../models/User');
const EVENTS = require('../shared/domainEvents');
const { subscribeEvents } = require('../shared/eventBus');

const handleBookingCreated = async ({ payload }) => {
  const userId = payload.userId || payload.booking?.user;
  const bookingId = payload.bookingId || payload.booking?._id;

  if (!userId || !bookingId) {
    return;
  }

  await User.findByIdAndUpdate(userId, {
    $addToSet: { bookings: bookingId }
  });
};

const startAuthSubscribers = async () => {
  await subscribeEvents({
    serviceName: 'auth-service',
    routingKeys: [EVENTS.BOOKING_CREATED],
    handler: async (event) => {
      if (event.type === EVENTS.BOOKING_CREATED) {
        await handleBookingCreated(event);
      }
    }
  });
};

module.exports = startAuthSubscribers;
