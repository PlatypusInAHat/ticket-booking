const internalAuth = require('../shared/internalAuth');
const bookingServicePackage = require('../services/booking/src');
const catalogServicePackage = require('../services/catalog/src');
const notificationServicePackage = require('../services/notification/src');
const { botProtectionService, cryptoUtils, serviceUrl } = require('@ticket-booking/platform');

const { isExpiredPendingBooking } = bookingServicePackage.services.booking;
const { groupEligibleEvents } = bookingServicePackage.services.eventReminder;
const { groupQuantitiesByEvent } = bookingServicePackage.services.purchaseLimit;
const { assessBotRisk } = botProtectionService;
const { normalizeTicketSelection } = catalogServicePackage.services.inventory;
const { buildUnsubscribeToken } = notificationServicePackage.services.emailQueue;
const { constantTimeEqual } = cryptoUtils;
const { normalizeServiceUrl } = serviceUrl;

describe('backend safety logic', () => {
  const originalInternalApiKey = process.env.INTERNAL_API_KEY;
  const originalSecretHashKey = process.env.SECRET_HASH_KEY;

  afterEach(() => {
    if (originalInternalApiKey === undefined) {
      delete process.env.INTERNAL_API_KEY;
    } else {
      process.env.INTERNAL_API_KEY = originalInternalApiKey;
    }

    if (originalSecretHashKey === undefined) {
      delete process.env.SECRET_HASH_KEY;
    } else {
      process.env.SECRET_HASH_KEY = originalSecretHashKey;
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

  test('bot risk scoring flags suspicious checkout clients', () => {
    const risk = assessBotRisk({
      body: { source: 'web' },
      get: (name) => (name === 'user-agent' ? 'curl/8.0' : '')
    }, {
      deviceFingerprint: ''
    });

    expect(risk.score).toBeGreaterThanOrEqual(60);
    expect(risk.reasons).toEqual(expect.arrayContaining([
      'missing_device_fingerprint',
      'suspicious_user_agent'
    ]));
  });

  test('purchase limit grouping sums quantities by event', () => {
    const grouped = groupQuantitiesByEvent([
      { event: 'event-a', quantity: 2 },
      { event: 'event-a', quantity: 3 },
      { event: 'event-b', quantity: 1 }
    ]);

    expect(grouped.get('event-a')).toBe(5);
    expect(grouped.get('event-b')).toBe(1);
  });

  test('event reminder grouping includes only events inside the reminder window', () => {
    const now = new Date('2026-07-03T10:00:00.000Z');
    const horizon = new Date('2026-07-04T10:00:00.000Z');
    const groups = groupEligibleEvents({
      tickets: [
        {
          quantity: 2,
          snapshot: {
            eventName: 'Summer Concert',
            ticketName: 'VIP',
            date: new Date('2026-07-04T09:00:00.000Z'),
            location: { venue: 'Main Arena' }
          }
        },
        {
          quantity: 1,
          snapshot: {
            eventName: 'Past Show',
            date: new Date('2026-07-03T09:00:00.000Z')
          }
        },
        {
          quantity: 1,
          snapshot: {
            eventName: 'Next Week Show',
            date: new Date('2026-07-10T09:00:00.000Z')
          }
        }
      ]
    }, now, horizon);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      title: 'Summer Concert',
      quantity: 2
    });
  });

  test('unsubscribe token is deterministic and signed', () => {
    process.env.SECRET_HASH_KEY = 'test-secret';

    const token = buildUnsubscribeToken('Customer@Example.com');
    const sameToken = buildUnsubscribeToken('customer@example.com');

    expect(token).toBe(sameToken);
    expect(constantTimeEqual(token, sameToken)).toBe(true);
  });

  test('service URLs support Kubernetes host:port values without clear-text protocol in config', () => {
    expect(normalizeServiceUrl('auth-service:5101')).toBe('http://auth-service:5101');
    expect(normalizeServiceUrl('https://api.example.com/')).toBe('https://api.example.com');
    expect(normalizeServiceUrl('', 'catalog-service:5102')).toBe('http://catalog-service:5102');
  });
});
