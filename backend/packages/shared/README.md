# Shared Package

This package contains low-level shared primitives that are safe to consume from every backend service package:

- `ApiError`
- `ApiResponse`
- `asyncHandler`
- `queryUtils`

The root `backend/utils/*` files currently re-export these modules to keep legacy imports working during migration.
