const express = require('express');
const router = express.Router();

const authRoutes = require('../services/auth/src/routes/auth');
const companyRoutes = require('../services/catalog/src/routes/companies');
const eventRoutes = require('../services/catalog/src/routes/events');
const ticketRoutes = require('../services/catalog/src/routes/tickets');
const bookingRoutes = require('../services/booking/src/routes/bookings');
const userRoutes = require('../services/auth/src/routes/users');
const adminRoutes = require('../services/auth/src/routes/admin');
const paymentRoutes = require('../services/booking/src/routes/payment');
const checkinRoutes = require('../services/checkin/src/routes/checkin');

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
