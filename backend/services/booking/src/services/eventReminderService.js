const crypto = require('crypto');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const { domainEvents, logger, publishDomainEvent } = require('@ticket-booking/platform');
const EVENTS = domainEvents;
const { serializeBookingForEvent } = require('./bookingService');

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;
const DEFAULT_WINDOW_HOURS = 24;
const DEFAULT_BATCH_SIZE = 50;

let reminderTimer = null;
let isRunning = false;

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getReminderWindowHours = () => {
  return parsePositiveInt(process.env.EVENT_REMINDER_WINDOW_HOURS, DEFAULT_WINDOW_HOURS);
};

const buildReminderKey = ({ bookingId, eventName, startsAt, venue, reminderWindowHours }) => {
  return crypto
    .createHash('sha256')
    .update([
      bookingId,
      eventName || 'event',
      startsAt ? new Date(startsAt).toISOString() : '',
      venue || '',
      reminderWindowHours
    ].join('|'))
    .digest('hex')
    .slice(0, 32);
};

const groupEligibleEvents = (booking, now, horizon) => {
  const groups = new Map();

  (booking.tickets || []).forEach((item) => {
    const snapshot = item.snapshot || {};
    const startsAt = snapshot.date ? new Date(snapshot.date) : null;

    if (!startsAt || startsAt < now || startsAt > horizon) {
      return;
    }

    const eventName = snapshot.eventName || snapshot.ticketName || 'TicketStage event';
    const venue = snapshot.location?.venue || '';
    const address = snapshot.location?.address || '';
    const city = snapshot.location?.city || '';
    const key = [
      eventName,
      startsAt.toISOString(),
      venue,
      address,
      city
    ].join('|');

    if (!groups.has(key)) {
      groups.set(key, {
        title: eventName,
        startsAt,
        location: snapshot.location || {},
        ticketNames: new Set(),
        quantity: 0
      });
    }

    const group = groups.get(key);
    group.quantity += Number(item.quantity || 0);
    group.ticketNames.add(snapshot.ticketName || eventName);
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    ticketNames: Array.from(group.ticketNames)
  }));
};

const publishReminderForEvent = async ({ booking, event, reminderWindowHours, now }) => {
  const reminderKey = buildReminderKey({
    bookingId: booking._id,
    eventName: event.title,
    startsAt: event.startsAt,
    venue: event.location?.venue,
    reminderWindowHours
  });

  const reminderPath = `metadata.reminders.${reminderKey}`;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const updatedBooking = await Booking.findOneAndUpdate(
      {
        _id: booking._id,
        [`${reminderPath}.sentAt`]: { $exists: false }
      },
      {
        $set: {
          [reminderPath]: {
            sentAt: now,
            reminderWindowHours,
            eventName: event.title,
            startsAt: event.startsAt,
            venue: event.location?.venue || ''
          },
          updatedAt: now
        }
      },
      {
        new: true,
        session
      }
    );

    if (!updatedBooking) {
      await session.abortTransaction();
      return false;
    }

    const published = await publishDomainEvent(EVENTS.EVENT_REMINDER_DUE, {
      booking: serializeBookingForEvent(updatedBooking),
      bookingId: updatedBooking._id.toString(),
      userId: updatedBooking.user.toString(),
      event: {
        id: reminderKey,
        title: event.title,
        startsAt: event.startsAt,
        location: event.location,
        ticketNames: event.ticketNames,
        quantity: event.quantity
      },
      reminderKey,
      reminderWindowHours
    }, {
      source: 'booking-service',
      session
    });

    if (!published) {
      throw new Error('Reminder event could not be published');
    }

    await session.commitTransaction();
    return true;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const processEventReminders = async (options = {}) => {
  const now = options.now || new Date();
  const reminderWindowHours = options.reminderWindowHours || getReminderWindowHours();
  const horizon = new Date(now.getTime() + reminderWindowHours * 60 * 60 * 1000);
  const limit = parsePositiveInt(options.limit || process.env.EVENT_REMINDER_BATCH_SIZE, DEFAULT_BATCH_SIZE);

  const bookings = await Booking.find({
    bookingStatus: 'confirmed',
    paymentStatus: 'completed',
    'tickets.snapshot.date': {
      $gte: now,
      $lte: horizon
    }
  })
    .sort({ confirmedAt: 1, createdAt: 1 })
    .limit(limit);

  let publishedCount = 0;
  let checkedEventCount = 0;

  for (const booking of bookings) {
    const events = groupEligibleEvents(booking, now, horizon);
    checkedEventCount += events.length;

    for (const event of events) {
      const published = await publishReminderForEvent({
        booking,
        event,
        reminderWindowHours,
        now
      });

      if (published) {
        publishedCount += 1;
      }
    }
  }

  return {
    checkedBookingCount: bookings.length,
    checkedEventCount,
    publishedCount,
    reminderWindowHours
  };
};

const startEventReminderWorker = () => {
  if (process.env.EVENT_REMINDER_WORKER_ENABLED === 'false' || process.env.NODE_ENV === 'test') {
    return null;
  }

  if (reminderTimer) {
    return reminderTimer;
  }

  const intervalMs = parsePositiveInt(process.env.EVENT_REMINDER_INTERVAL_MS, DEFAULT_INTERVAL_MS);

  const tick = async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;

    try {
      const result = await processEventReminders();

      if (result.publishedCount > 0) {
        logger.info(`[event-reminder] published ${result.publishedCount} reminder event(s)`);
      }
    } catch (error) {
      logger.error(`[event-reminder] worker failed: ${error.message}`);
    } finally {
      isRunning = false;
    }
  };

  reminderTimer = setInterval(tick, intervalMs);
  setTimeout(tick, 5000);
  reminderTimer.unref?.();

  logger.info(`[event-reminder] worker started (${intervalMs}ms)`);
  return reminderTimer;
};

const stopEventReminderWorker = () => {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
};

module.exports = {
  buildReminderKey,
  groupEligibleEvents,
  processEventReminders,
  startEventReminderWorker,
  stopEventReminderWorker
};
