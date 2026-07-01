const eventService = require('../services/eventService');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const getEvents = asyncHandler(async (req, res) => {
  const data = await eventService.getEvents(req.query);
  res.status(200).json(new ApiResponse(200, data));
});

const getEventById = asyncHandler(async (req, res) => {
  const event = await eventService.getEventById(req.params.id);
  res.status(200).json(new ApiResponse(200, event));
});

const createEvent = asyncHandler(async (req, res) => {
  const event = await eventService.createEvent(req.body, req.user);
  res.status(201).json(new ApiResponse(201, event, 'Event created successfully'));
});

const createEventBundle = asyncHandler(async (req, res) => {
  const event = await eventService.createEventBundle(req.body, req.user);
  res.status(201).json(new ApiResponse(201, event, 'Event bundle created successfully'));
});

const updateEvent = asyncHandler(async (req, res) => {
  const event = await eventService.updateEvent(req.params.id, req.body, req.user);
  res.status(200).json(new ApiResponse(200, event, 'Event updated successfully'));
});

const deleteEvent = asyncHandler(async (req, res) => {
  await eventService.deleteEvent(req.params.id, req.user);
  res.status(200).json(new ApiResponse(200, null, 'Event deleted successfully'));
});

module.exports = {
  createEvent,
  createEventBundle,
  deleteEvent,
  getEventById,
  getEvents,
  updateEvent
};
