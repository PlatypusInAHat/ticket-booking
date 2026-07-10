const express = require('express');
const catalogInventoryService = require('../../services/catalogInventoryService');
const Company = require('../../models/Company');
const Event = require('../../models/Event');
const Ticket = require('../../models/Ticket');
const { ApiResponse, asyncHandler } = require('@ticket-booking/shared');
const { internalAuth } = require('@ticket-booking/platform');

const router = express.Router();

router.use(internalAuth);

router.get('/stats', asyncHandler(async (req, res) => {
  const [totalCompanies, totalEvents, totalTickets, revenue] = await Promise.all([
    Company.countDocuments({ status: 'active' }),
    Event.countDocuments({ status: { $in: ['published', 'sold_out'] } }),
    Ticket.countDocuments({ isActive: true }),
    Event.aggregate([
      { $group: { _id: null, total: { $sum: '$stats.revenue' } } }
    ])
  ]);

  res.status(200).json(new ApiResponse(200, {
    totalCompanies,
    totalEvents,
    totalTickets,
    catalogRevenue: revenue[0]?.total || 0
  }));
}));

router.post('/tickets/reserve', asyncHandler(async (req, res) => {
  const reservation = await catalogInventoryService.reserveTickets(req.body.tickets || [], {
    userId: req.body.userId,
    expiresAt: req.body.expiresAt
  });
  res.status(200).json(new ApiResponse(200, reservation));
}));

router.post('/tickets/release', asyncHandler(async (req, res) => {
  const result = await catalogInventoryService.releaseTickets(req.body.tickets || [], {
    restoreRevenue: Boolean(req.body.restoreRevenue)
  });
  res.status(200).json(new ApiResponse(200, result));
}));

router.post('/events/revenue', asyncHandler(async (req, res) => {
  const result = await catalogInventoryService.applyRevenue(req.body.tickets || []);
  res.status(200).json(new ApiResponse(200, result));
}));

module.exports = router;
