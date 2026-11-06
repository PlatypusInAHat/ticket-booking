# Hot-sale load test

## Prepare isolated data

Start the auth and catalog MongoDB instances first, then run:

```powershell
npm run loadtest:prepare
```

The command creates or replaces only the fixture identified by
`HOT_SALE_FIXTURE_KEY`. It creates:

- one dedicated auth user;
- one company and concert event;
- one `EventSession`;
- one `general_admission` ticket with a configurable inventory.

The command prints `HOT_SALE_USER_ID`, `HOT_SALE_EVENT_ID`, and
`HOT_SALE_TICKET_ID`. The ticket is marked with `metadata.loadTestKey` and
uses 64 inventory buckets by default. It must never be used for real sales.

## Run k6

```powershell
$env:CATALOG_SERVICE_URL = 'http://localhost:5102'
$env:INTERNAL_API_KEY = 'dev_internal_key'
$env:HOT_SALE_TICKET_ID = '<value-from-prepare-command>'
$env:HOT_SALE_USER_ID = '<value-from-prepare-command>'
$env:HOT_SALE_TARGET_RPS = '50'
k6 run load-tests/hot-sale-inventory.js
```

Optional variables:

- `HOT_SALE_TICKET_QUANTITY`: inventory size, default `100000`.
- `HOT_SALE_FIXTURE_KEY`: isolated fixture key, default `ticketstage-hot-sale`.
- `HOT_SALE_TARGET_RPS`: target arrival rate, default `50`.

The test reserves and releases one item on every iteration and verifies that
the final inventory equals the initial inventory. It is an inventory
contention test, not a payment-provider or end-to-end checkout test.

## Roll out buckets for existing events

Enable buckets per ticket by running the migration after reviewing its scope:

```powershell
npm run db:migrate-inventory-buckets
```

Bucket availability is the source of truth for reserve/release. The denormalized
`Ticket.availableSeats`, `Ticket.soldSeats`, and event sold counter are refreshed
by:

```powershell
npm run db:sync-inventory-buckets
```

Run the sync as a short-interval CronJob or worker for public listing accuracy.
Keep `INVENTORY_BUCKETS_ENABLED=false` unless the ticket has been migrated or
created with `inventoryMode: "buckets"`.
