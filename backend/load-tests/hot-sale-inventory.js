import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const catalogUrl = (__ENV.CATALOG_SERVICE_URL || '').replace(/\/$/, '');
const internalApiKey = __ENV.INTERNAL_API_KEY || '';
const ticketId = __ENV.HOT_SALE_TICKET_ID || '';
const testUserId = __ENV.HOT_SALE_USER_ID || '000000000000000000000001';
const targetRate = Number(__ENV.HOT_SALE_TARGET_RPS || 50);

const reserveDuration = new Trend('inventory_reserve_duration', true);
const reserveFailures = new Rate('inventory_reserve_failures');

export const options = {
  scenarios: {
    ga_inventory: {
      executor: 'ramping-arrival-rate',
      startRate: Math.max(1, Math.floor(targetRate / 10)),
      timeUnit: '1s',
      preAllocatedVUs: Math.max(20, targetRate),
      maxVUs: Math.max(100, targetRate * 4),
      stages: [
        { target: targetRate, duration: '30s' },
        { target: targetRate, duration: '60s' },
        { target: 0, duration: '15s' }
      ]
    }
  },
  thresholds: {
    inventory_reserve_failures: ['rate<0.01'],
    inventory_reserve_duration: ['p(95)<400', 'p(99)<750'],
    http_req_failed: ['rate<0.01']
  }
};

const headers = () => ({
  'Content-Type': 'application/json',
  'x-internal-api-key': internalApiKey,
  'x-correlation-id': `k6-${__VU}-${__ITER}-${Date.now()}`
});

const getTicket = () => {
  const response = http.get(`${catalogUrl}/api/tickets/${ticketId}`, {
    tags: { operation: 'ticket_snapshot' }
  });

  if (response.status !== 200) {
    throw new Error(`Cannot read load-test ticket: HTTP ${response.status}`);
  }

  return response.json('data');
};

const getInventory = () => {
  const response = http.get(`${catalogUrl}/internal/catalog/tickets/${ticketId}/inventory`, {
    headers: { 'x-internal-api-key': internalApiKey },
    tags: { operation: 'inventory_summary' }
  });
  if (response.status !== 200) {
    throw new Error(`Cannot read load-test inventory: HTTP ${response.status}`);
  }
  return response.json('data');
};

export function setup() {
  if (!catalogUrl || !internalApiKey || !ticketId) {
    throw new Error('CATALOG_SERVICE_URL, INTERNAL_API_KEY and HOT_SALE_TICKET_ID are required');
  }

  const ticket = getTicket();
  if (ticket?.seatMap?.mode !== 'general_admission') {
    throw new Error('Hot-sale inventory load test requires a dedicated general_admission ticket');
  }

  return { initialAvailableSeats: Number(getInventory().availableSeats) };
}

export default function () {
  const reserveResponse = http.post(
    `${catalogUrl}/internal/catalog/tickets/reserve`,
    JSON.stringify({
      tickets: [{ ticketId, quantity: 1 }],
      userId: testUserId,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    }),
    { headers: headers(), tags: { operation: 'inventory_reserve' } }
  );

  reserveDuration.add(reserveResponse.timings.duration);
  const reserved = check(reserveResponse, {
    'inventory reserve succeeds': response => response.status === 200,
    'inventory reserve returns one item': response => response.json('data.items.0.quantity') === 1
  });
  reserveFailures.add(!reserved);

  if (reserved) {
    const items = reserveResponse.json('data.items');
    const releaseResponse = http.post(
      `${catalogUrl}/internal/catalog/tickets/release`,
      JSON.stringify({ tickets: items }),
      { headers: headers(), tags: { operation: 'inventory_release' } }
    );

    check(releaseResponse, {
      'inventory release succeeds': response => response.status === 200
    });
  }

  sleep(0.05);
}

export function teardown(data) {
  sleep(1);
  const finalAvailableSeats = Number(getInventory().availableSeats);

  if (finalAvailableSeats !== data.initialAvailableSeats) {
    throw new Error(
      `Inventory drift detected: before=${data.initialAvailableSeats}, after=${finalAvailableSeats}`
    );
  }
}
