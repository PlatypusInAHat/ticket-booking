---
name: gortex-frontend-src-components-3-dirs
description: "Work in the frontend\src\components +3 dirs area — 64 symbols across 4 files (92% cohesion)"
---

# frontend\src\components +3 dirs

64 symbols | 4 files | 92% cohesion

## When to Use

Use this skill when working on files in:
- `frontend\src\components\TurnstileWidget.tsx`
- `frontend\src\components\layout\Navbar.tsx`
- `frontend\src\pages\Checkout.tsx`
- `frontend\src\store\index.ts`

## Key Files

| File | Symbols |
|------|---------|
| `frontend\src\components\TurnstileWidget.tsx` | loadTurnstileScript, TurnstileWidget, error, containerRef, setError, ... |
| `frontend\src\components\layout\Navbar.tsx` | count, dispatch, location, Navbar, token, ... |
| `frontend\src\pages\Checkout.tsx` | bookingResponse, booking, redirectToGateway, deviceFingerprint, booking, ... |
| `frontend\src\store\index.ts` | useAppSelector |

## Entry Points

- `frontend\src\pages\Checkout.tsx::Checkout`
- `frontend\src\components\layout\Navbar.tsx::Navbar`
- `frontend\src\components\TurnstileWidget.tsx::TurnstileWidget`

## Connected Communities

- **frontend\src\components\layout +4 dirs** (2 cross-edges)

## How to Explore

```
get_communities with id: "community-86"
smart_context with task: "understand frontend\src\components +3 dirs", format: "gcx"
find_usages with id: "frontend\src\pages\Checkout.tsx::Checkout", format: "gcx"
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
