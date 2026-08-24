---
name: gortex-frontend-src-components-layout-4-dirs
description: "Work in the frontend\src\components\layout +4 dirs area — 44 symbols across 7 files (83% cohesion)"
---

# frontend\src\components\layout +4 dirs

44 symbols | 7 files | 83% cohesion

## When to Use

Use this skill when working on files in:
- `frontend\src\App.tsx`
- `frontend\src\components\PrivateRoute.jsx`
- `frontend\src\components\layout\Footer.tsx`
- `frontend\src\components\layout\Layout.tsx`
- `frontend\src\pages\Login.tsx`
- `frontend\src\pages\Register.tsx`
- `frontend\src\store\index.ts`

## Key Files

| File | Symbols |
|------|---------|
| `frontend\src\App.tsx` | dispatch, response, App, bootstrapProfile, setIsBootstrapping, ... |
| `frontend\src\components\PrivateRoute.jsx` | PrivateRoute |
| `frontend\src\components\layout\Footer.tsx` | Footer |
| `frontend\src\components\layout\Layout.tsx` | Layout, pathname |
| `frontend\src\pages\Login.tsx` | handleSubmit, setLoading, email, navigate, setEmail, ... |
| `frontend\src\pages\Register.tsx` | setConfirmPassword, email, confirmPassword, name, password, ... |
| `frontend\src\store\index.ts` | useAppDispatch |

## Entry Points

- `frontend\src\pages\Register.tsx::Register`
- `frontend\src\App.tsx::App`
- `frontend\src\pages\Login.tsx::Login`

## Connected Communities

- **frontend\src\components +3 dirs** (1 cross-edges)

## How to Explore

```
get_communities with id: "community-85"
smart_context with task: "understand frontend\src\components\layout +4 dirs", format: "gcx"
find_usages with id: "frontend\src\pages\Register.tsx::Register", format: "gcx"
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
