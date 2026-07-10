const bookingServicePackage = require('../services/booking/src');
const { domainEvents } = require('@ticket-booking/platform');
const { subscribeEvents } = require('../shared/eventBus');
const { Booking } = bookingServicePackage.models;
const EVENTS = domainEvents;

const handlePassCheckedIn = async ({ payload }) => {
  if (!payload.bookingId || !payload.passId) {
    return;
  }

  await Booking.findOneAndUpdate(
    {
      _id: payload.bookingId,
      'passes._id': payload.passId
    },
    {
      $set: {
        'passes.$.status': 'checked_in',
        'passes.$.checkedInAt': payload.checkedInAt || new Date(),
        'passes.$.checkedInBy': payload.staffId,
        'passes.$.checkInMethod': payload.method || '',
        'passes.$.checkInGate': payload.gate || '',
        'passes.$.checkInDevice': payload.deviceId || '',
        'passes.$.lastScannedAt': payload.checkedInAt || new Date(),
        updatedAt: new Date()
      },
      $inc: {
        'passes.$.scanCount': 1
      }
    }
  );
};

const startBookingSubscribers = async () => {
  await subscribeEvents({
    serviceName: 'booking-service',
    routingKeys: [EVENTS.PASS_CHECKED_IN],
    handler: async (event) => {
      if (event.type === EVENTS.PASS_CHECKED_IN) {
        await handlePassCheckedIn(event);
      }
    }
  });
};

module.exports = startBookingSubscribers;
