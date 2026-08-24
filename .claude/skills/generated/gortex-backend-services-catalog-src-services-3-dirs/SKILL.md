---
name: gortex-backend-services-catalog-src-services-3-dirs
description: "Work in the backend\services\catalog\src\services +3 dirs area — 37 symbols across 4 files (94% cohesion)"
---

# backend\services\catalog\src\services +3 dirs

37 symbols | 4 files | 94% cohesion

## When to Use

Use this skill when working on files in:
- `backend\services\catalog\src\services\eventService.js`
- `frontend\src\components\TicketTierCard.tsx`
- `frontend\src\components\ui\Badge.tsx`
- `frontend\src\pages\EventDetail.tsx`

## Key Files

| File | Symbols |
|------|---------|
| `backend\services\catalog\src\services\eventService.js` | getEvents, getEventById |
| `frontend\src\components\TicketTierCard.tsx` | TicketTierCard |
| `frontend\src\components\ui\Badge.tsx` | Badge, StatusBadge |
| `frontend\src\pages\EventDetail.tsx` | relatedResponse, setError, slug, quantity, setEvent, ... |

## Entry Points

- `frontend\src\pages\EventDetail.tsx::EventDetail`

## Connected Communities

- **frontend\src\components\layout +4 dirs** (1 cross-edges)

## How to Explore

```
get_communities with id: "community-64"
smart_context with task: "understand backend\services\catalog\src\services +3 dirs", format: "gcx"
find_usages with id: "frontend\src\pages\EventDetail.tsx::EventDetail", format: "gcx"
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
