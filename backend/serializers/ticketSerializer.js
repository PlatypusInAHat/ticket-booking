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

  const event = plainTicket.event && typeof plainTicket.event === 'object'
    ? plainTicket.event
    : null;
  const company = plainTicket.company && typeof plainTicket.company === 'object'
    ? plainTicket.company
    : null;

  const publicTicket = {
    _id: plainTicket._id,
    id: toId(plainTicket),
    eventId: toId(plainTicket.event),
    companyId: toId(plainTicket.company),
    eventName: plainTicket.eventName || event?.title || '',
    eventType: plainTicket.eventType || event?.eventType || '',
    name: plainTicket.name || plainTicket.ticketName || '',
    ticketName: plainTicket.ticketName || plainTicket.name || '',
    ticketType: plainTicket.ticketType || plainTicket.name || '',
    category: plainTicket.category || plainTicket.name || 'standard',
    description: plainTicket.description || '',
    image: plainTicket.image || event?.coverImage || '',
    location: plainTicket.location || event?.location,
    date: plainTicket.date || event?.startsAt,
    time: plainTicket.time || (event?.startsAt ? new Date(event.startsAt).toISOString().slice(11, 16) : ''),
    price: plainTicket.price,
    currency: plainTicket.currency || 'VND',
    availableSeats: plainTicket.availableSeats,
    totalSeats: plainTicket.totalSeats,
    soldSeats: plainTicket.soldSeats,
    status: plainTicket.status,
    isActive: plainTicket.isActive,
    visibility: plainTicket.visibility
  };

  if (company?.name) {
    publicTicket.company = toPublicCompany(company, { detail });
  }

  if (event?.title) {
    publicTicket.event = toPublicEvent(event, { detail });
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
