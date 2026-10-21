const {
  campaignIdFor,
  normalizeEventIds,
  signAccessToken,
  verifyAccessToken
} = require('../shared/waitingRoomToken');

describe('waiting-room access tokens', () => {
  beforeAll(() => {
    process.env.WAITING_ROOM_TOKEN_SECRET = 'test-waiting-room-secret-at-least-32-characters';
  });

  test('normalizes events and creates a stable campaign id', () => {
    expect(normalizeEventIds(['b', 'a', 'b'])).toEqual(['a', 'b']);
    expect(campaignIdFor(['b', 'a'])).toBe(campaignIdFor(['a', 'b', 'a']));
  });

  test('binds an access token to its user and events', () => {
    const token = signAccessToken({
      entryId: 'entry-1',
      eventIds: ['event-b', 'event-a'],
      userId: 'user-1',
      fingerprintHash: 'fingerprint',
      expiresIn: 60
    });
    const payload = verifyAccessToken(token);

    expect(payload.type).toBe('waiting-room-access');
    expect(payload.userId).toBe('user-1');
    expect(payload.eventIds).toEqual(['event-a', 'event-b']);
  });
});
