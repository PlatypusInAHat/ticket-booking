const dotenv = require('dotenv');
const mongoose = require('mongoose');

const authService = require('../services/auth/src');
const catalogService = require('../services/catalog/src');
const InventoryReservation = require('../services/catalog/src/models/InventoryReservation');
const InventoryBucket = require('../services/catalog/src/models/InventoryBucket');

dotenv.config();

const { User } = authService.models;
const { Company, Event, EventSession, Ticket } = catalogService.models;

const fixtureKey = process.env.HOT_SALE_FIXTURE_KEY || 'ticketstage-hot-sale';
const fixtureSlug = `loadtest-${fixtureKey}`
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, '-')
  .slice(0, 80);
const ticketName = `Hot Sale Load Test - ${fixtureKey}`;
const ticketQuantity = Math.max(1, Number.parseInt(process.env.HOT_SALE_TICKET_QUANTITY || '100000', 10));
const userEmail = process.env.HOT_SALE_USER_EMAIL ||
  `loadtest${fixtureSlug.replace(/-/g, '')}@ticketstage.com`;
const userPassword = process.env.HOT_SALE_USER_PASSWORD || 'LoadTestOnly-ChangeMe123!';

const connect = async (uri) => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
};

const disconnect = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

const getOrCreateLoadTestUser = async () => {
  const existing = await User.findOne({ email: userEmail });
  if (existing) return existing;

  return User.create({
    name: 'Hot Sale Load Test User',
    email: userEmail,
    password: userPassword,
    role: 'user',
    status: 'active',
    emailVerified: true
  });
};

const createCatalogFixture = async (user) => {
  const company = await Company.findOneAndUpdate(
    { slug: fixtureSlug },
    {
      $set: {
        name: `TicketStage Load Test Company (${fixtureKey})`,
        legalName: `TicketStage Load Test Company (${fixtureKey})`,
        owner: user._id,
        contact: {
          email: userEmail,
          website: 'https://ticketstage.local'
        },
        address: { city: 'Ho Chi Minh City', country: 'Viet Nam' },
        status: 'active',
        verification: { status: 'verified', verifiedAt: new Date(), verifiedBy: user._id }
      },
      $setOnInsert: { slug: fixtureSlug }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );

  const oldEvent = await Event.findOne({ 'metadata.loadTestKey': fixtureKey });
  if (oldEvent) {
    const oldTickets = await Ticket.find({ event: oldEvent._id }).select('_id').lean();
    const oldTicketIds = oldTickets.map(ticket => ticket._id);
    if (oldTicketIds.length > 0) {
      await InventoryReservation.deleteMany({ ticket: { $in: oldTicketIds } });
      await InventoryBucket.deleteMany({ ticket: { $in: oldTicketIds } });
    }
    await Ticket.deleteMany({ event: oldEvent._id });
    await EventSession.deleteMany({ event: oldEvent._id });
    await Event.deleteOne({ _id: oldEvent._id });
  }

  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 4 * 60 * 60 * 1000);
  const event = await Event.create({
    company: company._id,
    title: `Hot Sale Inventory Load Test - ${fixtureKey}`,
    slug: fixtureSlug,
    eventType: 'concert',
    description: 'Dedicated general-admission fixture for k6 inventory contention tests.',
    location: {
      venue: 'TicketStage Load Test Arena',
      city: 'Ho Chi Minh City',
      country: 'Viet Nam'
    },
    startsAt,
    endsAt,
    status: 'published',
    saleWindow: {
      startsAt: new Date(Date.now() - 60 * 1000),
      endsAt: endsAt
    },
    stats: { totalTickets: ticketQuantity, soldTickets: 0, revenue: 0 },
    metadata: { loadTestKey: fixtureKey, managedBy: 'prepareHotSaleLoadTest' },
    tags: ['load-test', 'general-admission']
  });

  const session = await EventSession.create({ event: event._id, startsAt, endsAt });

  const ticket = await Ticket.create({
    event: event._id,
    session: session._id,
    company: company._id,
    organizer: user._id,
    name: ticketName,
    ticketName: 'General Admission Load Test Ticket',
    eventName: event.title,
    ticketType: 'general_admission',
    category: 'standard',
    eventType: 'concert',
    visibility: 'public',
    location: event.location,
    date: startsAt,
    time: startsAt.toISOString().slice(11, 16),
    timezone: 'Asia/Ho_Chi_Minh',
    currency: 'VND',
    price: 100000,
    totalSeats: ticketQuantity,
    availableSeats: ticketQuantity,
    inventoryMode: 'buckets',
    inventoryBucketCount: Math.min(64, ticketQuantity),
    soldSeats: 0,
    saleWindow: event.saleWindow,
    description: 'Dedicated load-test inventory. Do not sell to real users.',
    tags: ['load-test', 'general-admission'],
    policies: { maxTicketsPerUser: 1, minTicketsPerUser: 1 },
    seatMap: { mode: 'general_admission' },
    status: 'published',
    isActive: true
  });

  await catalogService.services.inventory.ensureInventoryBuckets(ticket);

  return { company, event, session, ticket, user };
};

const run = async () => {
  const authUri = process.env.AUTH_MONGODB_URI || 'mongodb://127.0.0.1:27018/ticket-auth?replicaSet=rs0';
  const catalogUri = process.env.CATALOG_MONGODB_URI || 'mongodb://127.0.0.1:27019/ticket-catalog?replicaSet=rs0';

  try {
    await connect(authUri);
    const user = await getOrCreateLoadTestUser();
    await disconnect();

    await connect(catalogUri);
    const fixture = await createCatalogFixture(user);

    console.log(JSON.stringify({
      fixtureKey,
      userEmail,
      userPassword,
      HOT_SALE_USER_ID: user._id.toString(),
      HOT_SALE_EVENT_ID: fixture.event._id.toString(),
      HOT_SALE_TICKET_ID: fixture.ticket._id.toString(),
      HOT_SALE_TICKET_QUANTITY: ticketQuantity,
      CATALOG_SERVICE_URL: process.env.CATALOG_SERVICE_URL || 'http://localhost:5102',
      INTERNAL_API_KEY: process.env.INTERNAL_API_KEY || 'dev_internal_key'
    }, null, 2));
  } finally {
    await disconnect();
  }
};

run().catch(error => {
  console.error('Hot-sale load-test fixture preparation failed:', error);
  process.exitCode = 1;
});
