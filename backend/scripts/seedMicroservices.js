const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Company = require('../models/Company');
const Event = require('../models/Event');
const SeatLock = require('../models/SeatLock');
const { sampleTickets, sampleUsers, upsertUser } = require('./seed');

dotenv.config();

const connect = async (uri, label) => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(uri);
  console.log(`[seed:${label}] connected`);
};

const seedAuthDb = async () => {
  const authUri = process.env.AUTH_MONGODB_URI || 'mongodb://127.0.0.1:27017/ticket-auth';
  await connect(authUri, 'auth');

  await User.deleteMany({});
  const users = await Promise.all(sampleUsers.map(upsertUser));
  const adminUser = users.find(user => user.role === 'admin');

  console.log(`[seed:auth] users=${users.length}`);
  return adminUser;
};

const seedCatalogDb = async (adminUser) => {
  const catalogUri = process.env.CATALOG_MONGODB_URI || 'mongodb://127.0.0.1:27017/ticket-catalog';
  await connect(catalogUri, 'catalog');

  await SeatLock.deleteMany({});
  await Ticket.deleteMany({});
  await Event.deleteMany({});
  await Company.deleteMany({});

  const demoCompany = await Company.create({
    name: 'TicketBooking Demo Company',
    slug: 'ticketbooking-demo-company',
    legalName: 'TicketBooking Demo Company Ltd.',
    taxCode: 'DEMO-TB-001',
    owner: adminUser._id,
    contact: {
      email: adminUser.email,
      phone: adminUser.phone,
      website: 'https://ticketbooking.local'
    },
    address: {
      city: 'TP HCM',
      country: 'Viet Nam'
    },
    status: 'active',
    verification: {
      status: 'verified',
      verifiedAt: new Date(),
      verifiedBy: adminUser._id
    }
  });

  const events = await Event.insertMany(sampleTickets.map(ticket => ({
    company: demoCompany._id,
    organizer: adminUser._id,
    title: ticket.eventName,
    eventType: ticket.eventType,
    description: ticket.description,
    coverImage: ticket.image,
    location: ticket.location,
    startsAt: ticket.date,
    timezone: 'Asia/Ho_Chi_Minh',
    status: 'published',
    saleWindow: {
      startsAt: new Date(),
      endsAt: ticket.date
    },
    policies: {
      ageRestriction: ticket.ageRestriction || 0,
      transferAllowed: false
    },
    stats: {
      totalTickets: ticket.totalSeats,
      soldTickets: 0,
      revenue: 0
    }
  })));

  const ticketsToCreate = sampleTickets.map((ticket, index) => ({
    ...ticket,
    event: events[index]._id,
    company: demoCompany._id,
    ticketName: `${ticket.category || 'standard'} ticket`,
    ticketType: ticket.category === 'vip' ? 'vip' : 'general_admission',
    currency: 'VND',
    organizer: adminUser._id
  }));

  const tickets = await Ticket.insertMany(ticketsToCreate);
  console.log(`[seed:catalog] companies=1 events=${events.length} tickets=${tickets.length}`);
};

const seedMicroservices = async () => {
  try {
    const adminUser = await seedAuthDb();
    await seedCatalogDb(adminUser);

    console.log('Microservice seed completed successfully');
    console.log(`Admin: ${sampleUsers[0].email} / ${sampleUsers[0].password}`);
    console.log(`User: ${sampleUsers[1].email} / ${sampleUsers[1].password}`);
    console.log(`Staff: ${sampleUsers[2].email} / ${sampleUsers[2].password}`);
  } catch (error) {
    console.error('Microservice seed failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedMicroservices();
