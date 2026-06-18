const toPlainObject = (document) => {
  if (!document) {
    return null;
  }

  if (typeof document.toObject === 'function') {
    return document.toObject();
  }

  return document;
};

const toId = (value) => {
  if (!value) {
    return null;
  }

  if (value._id) {
    return value._id.toString();
  }

  return value.toString();
};

const toPublicCompany = (company, { detail = false } = {}) => {
  const plainCompany = toPlainObject(company);

  if (!plainCompany) {
    return null;
  }

  const payload = {
    _id: plainCompany._id,
    id: toId(plainCompany),
    name: plainCompany.name,
    slug: plainCompany.slug,
    logo: plainCompany.logo || '',
    status: plainCompany.status
  };

  if (detail) {
    payload.contact = plainCompany.contact;
    payload.address = plainCompany.address;
    payload.description = plainCompany.description;
    payload.verificationStatus = plainCompany.verification?.status;
  }

  return payload;
};

const toPublicEvent = (event, { detail = false } = {}) => {
  const plainEvent = toPlainObject(event);

  if (!plainEvent) {
    return null;
  }

  const payload = {
    _id: plainEvent._id,
    id: toId(plainEvent),
    companyId: toId(plainEvent.company),
    title: plainEvent.title,
    slug: plainEvent.slug,
    eventType: plainEvent.eventType,
    coverImage: plainEvent.coverImage,
    location: plainEvent.location,
    startsAt: plainEvent.startsAt,
    endsAt: plainEvent.endsAt,
    status: plainEvent.status
  };

  if (detail) {
    payload.description = plainEvent.description;
    payload.gallery = plainEvent.gallery || [];
    payload.timezone = plainEvent.timezone;
    payload.saleWindow = plainEvent.saleWindow;
    payload.admission = plainEvent.admission;
    payload.policies = plainEvent.policies;
    payload.tags = plainEvent.tags || [];
  }

  return payload;
};

const toPublicTicket = (ticket, { detail = false } = {}) => {
  const plainTicket = toPlainObject(ticket);

  if (!plainTicket) {
    return null;
  }

  const publicTicket = {
    _id: plainTicket._id,
    id: toId(plainTicket),
    eventId: toId(plainTicket.event),
    companyId: toId(plainTicket.company),
    eventName: plainTicket.eventName,
    eventType: plainTicket.eventType,
    ticketName: plainTicket.ticketName || '',
    ticketType: plainTicket.ticketType,
    category: plainTicket.category,
    description: plainTicket.description || '',
    image: plainTicket.image,
    location: plainTicket.location,
    date: plainTicket.date,
    time: plainTicket.time,
    price: plainTicket.price,
    currency: plainTicket.currency || 'VND',
    availableSeats: plainTicket.availableSeats,
    totalSeats: plainTicket.totalSeats,
    soldSeats: plainTicket.soldSeats,
    status: plainTicket.status,
    isActive: plainTicket.isActive,
    visibility: plainTicket.visibility
  };

  if (plainTicket.company && plainTicket.company.name) {
    publicTicket.company = toPublicCompany(plainTicket.company, { detail });
  }

  if (plainTicket.event && plainTicket.event.title) {
    publicTicket.event = toPublicEvent(plainTicket.event, { detail });
  }

  if (detail) {
    publicTicket.saleWindow = plainTicket.saleWindow;
    publicTicket.timezone = plainTicket.timezone;
    publicTicket.admission = plainTicket.admission;
    publicTicket.seatMap = plainTicket.seatMap;
    publicTicket.policies = plainTicket.policies;
    publicTicket.tags = plainTicket.tags || [];
    publicTicket.artist = plainTicket.artist || '';
    publicTicket.duration = plainTicket.duration || '';
    publicTicket.ageRestriction = plainTicket.ageRestriction || 0;
  }

  return publicTicket;
};

module.exports = {
  toId,
  toPublicCompany,
  toPublicEvent,
  toPublicTicket
};
