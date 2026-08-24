---
name: gortex-backend-shared-subscribeevents
description: "Work in the backend\shared · subscribeEvents area — 19 symbols across 3 files (95% cohesion)"
---

# backend\shared · subscribeEvents

19 symbols | 3 files | 95% cohesion

## When to Use

Use this skill when working on files in:
- `backend\shared\domainEventSubscriber.js`
- `backend\shared\eventBus.js`
- `backend\shared\eventConsumerIdempotency.js`

## Key Files

| File | Symbols |
|------|---------|
| `backend\shared\domainEventSubscriber.js` | handler, subscribeToDomainEvents |
| `backend\shared\eventBus.js` | connectEventBus, getTracer, publishEnvelope, isBrokerEnabled, getRetryCount, ... |
| `backend\shared\eventConsumerIdempotency.js` | markEventCompleted, parsePositiveInt, claimEvent, isIdempotencyEnabled, getProcessingTimeoutMs, ... |

## Entry Points

- `backend\shared\eventBus.js::subscribeEvents`

## How to Explore

```
get_communities with id: "community-47"
smart_context with task: "understand backend\shared · subscribeEvents", format: "gcx"
find_usages with id: "backend\shared\eventBus.js::subscribeEvents", format: "gcx"
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
