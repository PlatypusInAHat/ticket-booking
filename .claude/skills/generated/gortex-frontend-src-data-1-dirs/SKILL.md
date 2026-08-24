---
name: gortex-frontend-src-data-1-dirs
description: "Work in the frontend\src\data +1 dirs area — 19 symbols across 2 files (89% cohesion)"
---

# frontend\src\data +1 dirs

19 symbols | 2 files | 89% cohesion

## When to Use

Use this skill when working on files in:
- `frontend\src\data\types.ts`
- `frontend\src\utils\eventMapper.ts`

## Key Files

| File | Symbols |
|------|---------|
| `frontend\src\data\types.ts` | TicketTier, EventItem, EventStatus, EventCategory |
| `frontend\src\utils\eventMapper.ts` | mapApiEventToEventItem, companyName, tiers, remaining, apiEvent, ... |

## Entry Points

- `frontend\src\utils\eventMapper.ts::mapApiEventToEventItem`

## Connected Communities

- **frontend\src\utils · mapApiTicketToTier** (1 cross-edges)

## How to Explore

```
get_communities with id: "community-89"
smart_context with task: "understand frontend\src\data +1 dirs", format: "gcx"
find_usages with id: "frontend\src\utils\eventMapper.ts::mapApiEventToEventItem", format: "gcx"
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
