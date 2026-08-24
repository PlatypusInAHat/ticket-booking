---
name: gortex-frontend-src-pages-1-dirs-generatetokens
description: "Work in the frontend\src\pages +1 dirs · generateTokens area — 19 symbols across 3 files (97% cohesion)"
---

# frontend\src\pages +1 dirs · generateTokens

19 symbols | 3 files | 97% cohesion

## When to Use

Use this skill when working on files in:
- `backend\services\auth\src\services\authService.js`
- `frontend\src\pages\Login.tsx`
- `frontend\src\pages\Register.tsx`

## Key Files

| File | Symbols |
|------|---------|
| `backend\services\auth\src\services\authService.js` | getRefreshSecret, login, getAccessTokenExpiry, getRefreshTokenExpiry, register, ... |
| `frontend\src\pages\Login.tsx` | response, event, handleSubmit, err, authData, ... |
| `frontend\src\pages\Register.tsx` | err, response, authData, handleSubmit, event |

## How to Explore

```
get_communities with id: "community-24"
smart_context with task: "understand frontend\src\pages +1 dirs · generateTokens", format: "gcx"
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
