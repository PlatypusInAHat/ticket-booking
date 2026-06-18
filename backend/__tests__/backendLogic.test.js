const internalAuth = require('../shared/internalAuth');
const { isExpiredPendingBooking } = require('../services/bookingService');
const { normalizeTicketSelection } = require('../services/catalogInventoryService');

describe('backend safety logic', () => {
  const originalInternalApiKey = process.env.INTERNAL_API_KEY;

  afterEach(() => {
    if (originalInternalApiKey === undefined) {
      delete process.env.INTERNAL_API_KEY;
    } else {
      process.env.INTERNAL_API_KEY = originalInternalApiKey;
    }
  });

  test('internalAuth fails closed when INTERNAL_API_KEY is missing', () => {
    delete process.env.INTERNAL_API_KEY;
    const next = jest.fn();

    internalAuth({ get: jest.fn() }, {}, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 500
    }));
  });

  test('internalAuth rejects wrong key and accepts correct key', () => {
    process.env.INTERNAL_API_KEY = 'secret-key';

    const wrongNext = jest.fn();
    internalAuth({ get: () => 'wrong-key' }, {}, wrongNext);
    expect(wrongNext).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401
    }));

    const okNext = jest.fn();
    internalAuth({ get: () => 'secret-key' }, {}, okNext);
    expect(okNext).toHaveBeenCalledWith();
  });

  test('pending booking is expired only after hold window passes', () => {
    const now = new Date('2026-06-17T10:00:00.000Z');

    expect(isExpiredPendingBooking({
      bookingStatus: 'pending',
      paymentStatus: 'pending',
      expiresAt: new Date('2026-06-17T09:59:59.000Z')
    }, now)).toBe(true);

    expect(isExpiredPendingBooking({
      bookingStatus: 'confirmed',
      paymentStatus: 'completed',
      expiresAt: new Date('2026-06-17T09:59:59.000Z')
    }, now)).toBe(false);
  });

  test('ticket selections are normalized and duplicate ticket IDs are merged', () => {
    const normalized = normalizeTicketSelection([
      { ticketId: 'ticket-a', quantity: 2 },
      { ticket: 'ticket-a', quantity: 3 },
      { ticketId: 'ticket-b', quantity: 1 },
      { ticketId: '', quantity: 10 },
      { ticketId: 'ticket-c', quantity: 0 }
    ]);

    expect(normalized).toEqual([
      { ticketId: 'ticket-a', quantity: 5 },
      { ticketId: 'ticket-b', quantity: 1 }
    ]);
  });
});
