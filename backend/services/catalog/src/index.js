module.exports = {
  routes: {
    companies: require('./routes/companies'),
    events: require('./routes/events'),
    tickets: require('./routes/tickets'),
    upload: require('./routes/upload'),
    internalCatalog: require('./routes/internal/catalog')
  },
  services: {
    company: require('./services/companyService'),
    event: require('./services/eventService'),
    ticket: require('./services/ticketService'),
    inventory: require('./services/catalogInventoryService')
  },
  models: {
    Company: require('./models/Company'),
    Event: require('./models/Event'),
    Ticket: require('./models/Ticket'),
    SeatLock: require('./models/SeatLock')
  }
};
