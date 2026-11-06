const dotenv = require('dotenv');
const mongoose = require('mongoose');
const authServicePackage = require('../services/auth/src');
const bookingServicePackage = require('../services/booking/src');
const catalogServicePackage = require('../services/catalog/src');
const checkinServicePackage = require('../services/checkin/src');

const { User } = authServicePackage.models;
const { Booking, Payment } = bookingServicePackage.models;
const { Ticket, Company, Event, SeatLock } = catalogServicePackage.models;
const { CheckInLog, CheckInDevice } = checkinServicePackage.models;

dotenv.config();

const sampleUsers = [
  {
    name: 'Admin TicketBooking',
    email: process.env.ADMIN_EMAIL || 'admin@ticketbooking.com',
    password: 'admin12345',
    role: 'admin',
    phone: '0900000001'
  },
  {
    name: 'Demo User',
    email: 'user@ticketbooking.com',
    password: 'user12345',
    role: 'user',
    phone: '0900000002'
  },
  {
    name: 'Check-in Staff',
    email: 'staff@ticketbooking.com',
    password: 'staff12345',
    role: 'staff',
    phone: '0900000003'
  }
];

const sampleTickets = [
  {
    eventName: 'Taylor Swift Eras Night',
    eventType: 'concert',
    description: 'Dem concert voi san khau LED, am thanh lon va khu VIP.',
    image: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
    location: { venue: 'My Dinh Arena', city: 'Ha Noi', state: 'Ha Noi', country: 'Viet Nam' },
    date: new Date('2026-08-14'),
    time: '20:00',
    price: 1800000,
    availableSeats: 120,
    totalSeats: 120,
    category: 'vip'
  },
  {
    eventName: 'Chuyen Tau Sai Gon - Da Nang',
    eventType: 'train',
    description: 'Tau dem khoang rieng, wifi va bua an nhe.',
    image: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1200&q=80',
    location: { venue: 'Ga Sai Gon', city: 'TP HCM', state: 'TP HCM', country: 'Viet Nam' },
    date: new Date('2026-07-22'),
    time: '21:30',
    price: 950000,
    availableSeats: 80,
    totalSeats: 80,
    category: 'standard'
  },
  {
    eventName: 'Da Nang - Singapore Weekend Flight',
    eventType: 'flight',
    description: 'Chuyen bay cuoi tuan cho ky nghi ngan ngay.',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80',
    location: { venue: 'Da Nang International Airport', city: 'Da Nang', state: 'Da Nang', country: 'Viet Nam' },
    date: new Date('2026-09-03'),
    time: '09:15',
    price: 3200000,
    availableSeats: 56,
    totalSeats: 56,
    category: 'premium'
  },
  {
    eventName: 'Thu Bay Khong Lo',
    eventType: 'movie',
    description: 'Suat chieu som voi ghe doi va combo popcorn.',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
    location: { venue: 'CGV Landmark 81', city: 'TP HCM', state: 'TP HCM', country: 'Viet Nam' },
    date: new Date('2026-06-28'),
    time: '19:45',
    price: 180000,
    availableSeats: 150,
    totalSeats: 150,
    category: 'standard'
  }
];

const upsertUser = async (userData) => {
  let user = await User.findOne({ email: userData.email });

  if (!user) {
    user = new User(userData);
  } else {
    user.name = userData.name;
    user.role = userData.role;
    user.phone = userData.phone;
    user.password = userData.password;
  }

  user.bookings = [];
  await user.save();
  return user;
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    await Payment.deleteMany({});
    await CheckInLog.deleteMany({});
    await CheckInDevice.deleteMany({});
    await SeatLock.deleteMany({});
    await Booking.deleteMany({});
    await Ticket.deleteMany({});
    await Event.deleteMany({});
    await Company.deleteMany({});

    const users = await Promise.all(sampleUsers.map(upsertUser));
    const adminUser = users.find(user => user.role === 'admin');
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

    await Ticket.insertMany(ticketsToCreate);

    console.log('Seed completed successfully');
    console.log(`Admin: ${sampleUsers[0].email} / ${sampleUsers[0].password}`);
    console.log(`User: ${sampleUsers[1].email} / ${sampleUsers[1].password}`);
    console.log(`Staff: ${sampleUsers[2].email} / ${sampleUsers[2].password}`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  seed();
}

module.exports = {
  sampleTickets,
  sampleUsers,
  seed,
  upsertUser
};
