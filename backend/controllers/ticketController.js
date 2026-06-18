const ticketService = require('../services/ticketService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const getAllTickets = asyncHandler(async (req, res) => {
  const data = await ticketService.getAllTickets(req.query);
  res.status(200).json(new ApiResponse(200, data));
});

const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await ticketService.getTicketById(req.params.id);
  res.status(200).json(new ApiResponse(200, ticket));
});

const createTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.createTicket(req.body, req.user);
  res.status(201).json(new ApiResponse(201, ticket, 'Ticket created successfully'));
});

const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.updateTicket(req.params.id, req.body, req.user);
  res.status(200).json(new ApiResponse(200, ticket, 'Ticket updated successfully'));
});

const deleteTicket = asyncHandler(async (req, res) => {
  await ticketService.deleteTicket(req.params.id, req.user);
  res.status(200).json(new ApiResponse(200, null, 'Ticket deleted successfully'));
});

module.exports = {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket
};
