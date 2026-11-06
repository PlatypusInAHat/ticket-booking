const dotenv = require('dotenv');
const mongoose = require('mongoose');
const authServicePackage = require('../services/auth/src');
const catalogServicePackage = require('../services/catalog/src');

const { User } = authServicePackage.models;
const { Company, Event, Ticket } = catalogServicePackage.models;

dotenv.config();

const ensureDemoCompany = async (owner) => {
  let company = await Company.findOne({
    $or: [
      { slug: 'ticketbooking-demo-company' },
      { taxCode: 'DEMO-TB-001' }
    ]
  });

  if (!company) {
    company = await Company.create({
      name: 'TicketBooking Demo Company',
      slug: 'ticketbooking-demo-company',
      legalName: 'TicketBooking Demo Company Ltd.',
      taxCode: 'DEMO-TB-001',
      owner: owner._id,
      contact: {
        email: owner.email,
        phone: owner.phone || '',
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
        verifiedBy: owner._id
      }
    });
  }

  return company;
};

const backfill = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const owner = await User.findOne({ role: 'admin' }) || await User.findOne();
    if (!owner) {
      throw new Error('No user found to own backfilled company/events');
    }

    const company = await ensureDemoCompany(owner);
    const tickets = await Ticket.find({ $or: [{ event: { $exists: false } }, { event: null }] });

    let eventCount = 0;
    let ticketCount = 0;

    for (const ticket of tickets) {
      const event = await Event.create({
        company: company._id,
        organizer: ticket.organizer || owner._id,
        title: ticket.eventName,
        eventType: ticket.eventType,
        description: ticket.description,
        coverImage: ticket.image,
        location: ticket.location,
        startsAt: ticket.date,
        timezone: ticket.timezone || 'Asia/Ho_Chi_Minh',
        status: ticket.status || 'published',
        saleWindow: ticket.saleWindow,
        admission: ticket.admission,
        policies: {
          refundPolicy: ticket.policies?.refundPolicy || '',
          transferAllowed: ticket.policies?.transferAllowed || false,
          ageRestriction: ticket.ageRestriction || 0
        },
        tags: ticket.tags || [],
        stats: {
          totalTickets: ticket.totalSeats || 0,
          soldTickets: ticket.soldSeats || 0,
          revenue: 0,
          views: ticket.stats?.views || 0
        }
      });

      ticket.event = event._id;
      ticket.company = company._id;
      ticket.ticketName = ticket.ticketName || `${ticket.category || 'standard'} ticket`;
      ticket.ticketType = ticket.ticketType || (ticket.category === 'vip' ? 'vip' : 'general_admission');
      await ticket.save();

      eventCount += 1;
      ticketCount += 1;
    }

    console.log(`Backfilled ${eventCount} events and linked ${ticketCount} tickets to company ${company.name}`);
  } catch (error) {
    console.error('Backfill events failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

backfill();
