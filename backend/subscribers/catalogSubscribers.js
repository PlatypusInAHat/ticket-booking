const catalogServicePackage = require('../services/catalog/src');
const { domainEvents } = require('@ticket-booking/platform');
const { subscribeEvents } = require('../shared/eventBus');
const catalogInventoryService = catalogServicePackage.services.inventory;
const EVENTS = domainEvents;

const startCatalogSubscribers = async () => {
  await subscribeEvents({
    serviceName: 'catalog-service',
    routingKeys: [
      EVENTS.PAYMENT_COMPLETED,
      EVENTS.BOOKING_CANCELLED,
      EVENTS.BOOKING_EXPIRED
    ],
    handler: async (event) => {
      if (event.type === EVENTS.PAYMENT_COMPLETED) {
        await catalogInventoryService.applyRevenue(event.payload.booking?.tickets || []);
        return;
      }

      if ([EVENTS.BOOKING_CANCELLED, EVENTS.BOOKING_EXPIRED].includes(event.type)) {
        await catalogInventoryService.releaseTickets(event.payload.booking?.tickets || [], {
          restoreRevenue: Boolean(event.payload.restoreRevenue)
        });
      }
    }
  });
};

module.exports = startCatalogSubscribers;
