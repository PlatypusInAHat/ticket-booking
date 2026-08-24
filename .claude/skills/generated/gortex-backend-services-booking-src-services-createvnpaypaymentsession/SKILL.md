---
name: gortex-backend-services-booking-src-services-createvnpaypaymentsession
description: "Work in the backend\services\booking\src\services · createVnpayPaymentSession area — 28 symbols across 2 files (96% cohesion)"
---

# backend\services\booking\src\services · createVnpayPaymentSession

28 symbols | 2 files | 96% cohesion

## When to Use

Use this skill when working on files in:
- `backend\services\booking\src\services\bookingService.js`
- `backend\services\booking\src\services\paymentService.js`

## Key Files

| File | Symbols |
|------|---------|
| `backend\services\booking\src\services\bookingService.js` | isExpiredPendingBooking |
| `backend\services\booking\src\services\paymentService.js` | handleMomoWebhook, toVnpayAmount, createMomoPaymentSession, sortObject, verifyVnpaySignature, ... |

## Entry Points

- `backend\services\booking\src\services\paymentService.js::handleMomoWebhook`
- `backend\services\booking\src\services\paymentService.js::handleVnpayResult`

## Connected Communities

- **backend\services\booking\src\services · serializeBookingForEvent** (2 cross-edges)
- **backend\services\booking\src\services · requestCatalog** (1 cross-edges)

## How to Explore

```
get_communities with id: "community-30"
smart_context with task: "understand backend\services\booking\src\services · createVnpayPaymentSession", format: "gcx"
find_usages with id: "backend\services\booking\src\services\paymentService.js::handleMomoWebhook", format: "gcx"
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
