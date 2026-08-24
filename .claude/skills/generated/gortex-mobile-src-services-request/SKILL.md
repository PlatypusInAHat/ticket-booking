---
name: gortex-mobile-src-services-request
description: "Work in the mobile\src\services · request area — 28 symbols across 2 files (100% cohesion)"
---

# mobile\src\services · request

28 symbols | 2 files | 100% cohesion

## When to Use

Use this skill when working on files in:
- `mobile\src\services\api.js`
- `mobile\src\services\storage.js`

## Key Files

| File | Symbols |
|------|---------|
| `mobile\src\services\api.js` | bookingApi.cancel, checkinApi.stats, getAuthHeaders, authApi.login, paymentApi.status, ... |
| `mobile\src\services\storage.js` | saveAuth, clearAuth, loadAuth |

## How to Explore

```
get_communities with id: "community-174"
smart_context with task: "understand mobile\src\services · request", format: "gcx"
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
