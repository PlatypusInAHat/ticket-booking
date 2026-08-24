---
name: gortex-frontend-src-pages-1-dirs-paymentresult
description: "Work in the frontend\src\pages +1 dirs · PaymentResult area — 22 symbols across 3 files (97% cohesion)"
---

# frontend\src\pages +1 dirs · PaymentResult

22 symbols | 3 files | 97% cohesion

## When to Use

Use this skill when working on files in:
- `backend\services\booking\src\services\paymentService.js`
- `frontend\src\pages\ApiManagement.tsx`
- `frontend\src\pages\PaymentResult.tsx`

## Key Files

| File | Symbols |
|------|---------|
| `backend\services\booking\src\services\paymentService.js` | getPaymentStatus |
| `frontend\src\pages\ApiManagement.tsx` | setData, ApiManagement, data, setError, loading, ... |
| `frontend\src\pages\PaymentResult.tsx` | Icon, searchParams, setMessage, status, config, ... |

## Entry Points

- `frontend\src\pages\ApiManagement.tsx::ApiManagement`
- `frontend\src\pages\PaymentResult.tsx::PaymentResult`

## How to Explore

```
get_communities with id: "community-79"
smart_context with task: "understand frontend\src\pages +1 dirs · PaymentResult", format: "gcx"
find_usages with id: "frontend\src\pages\ApiManagement.tsx::ApiManagement", format: "gcx"
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
