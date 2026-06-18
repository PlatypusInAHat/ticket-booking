const { subscribeEvents } = require('./eventBus');

const subscribeToDomainEvents = async ({ group, handlers }) => {
  const routingKeys = Object.keys(handlers);
  
  if (routingKeys.length === 0) {
    return false;
  }

  const handler = async (envelope) => {
    const specificHandler = handlers[envelope.type];
    if (specificHandler) {
      await specificHandler(envelope.payload);
    }
  };

  return subscribeEvents({
    serviceName: group,
    routingKeys,
    handler
  });
};

module.exports = {
  subscribeToDomainEvents
};
