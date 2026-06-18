const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const companyRoutes = require('./companies');
const eventRoutes = require('./events');
const ticketRoutes = require('./tickets');
const bookingRoutes = require('./bookings');
const userRoutes = require('./users');
const adminRoutes = require('./admin');
const paymentRoutes = require('./payment');
const checkinRoutes = require('./checkin');

router.use('/auth', authRoutes);
router.use('/companies', companyRoutes);
router.use('/events', eventRoutes);
router.use('/tickets', ticketRoutes);
router.use('/bookings', bookingRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/payment', paymentRoutes);
router.use('/checkin', checkinRoutes);

module.exports = router;
