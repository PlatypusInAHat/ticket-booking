# Backend Service Packages

This folder now contains deployment-facing service packages separated from the shared application source:

- `api-gateway/`
- `auth/`
- `catalog/`
- `booking/`
- `checkin/`
- `notification/`

Each package contains:

- a dedicated `Dockerfile`
- a lightweight `package.json`
- an internal OpenAPI contract where the service exposes peer-to-peer endpoints
- a `src/` tree for service-owned domain code

## Internal contracts

- `catalog/openapi.internal.yaml`
- `booking/openapi.internal.yaml`
- `checkin/openapi.internal.yaml`
- `notification/openapi.internal.yaml`

## Production hardening note

For production environments with strict east-west security requirements, place these services behind a service mesh such as Istio or Linkerd and enable:

- mTLS between service identities
- retry/timeout policies at the mesh layer
- traffic policies and request-level telemetry

The application layer now includes timeout, retry, circuit-breaker, and consumer idempotency safeguards, but mesh-level mTLS is still the stronger option for zero-trust cluster networking.

## Migration status

- `auth`: migrated to `services/auth/src`
- `booking`: migrated to `services/booking/src`
- `catalog`: migrated to `services/catalog/src`
- `checkin`: migrated to `services/checkin/src`
- `notification`: migrated to `services/notification/src`

Compatibility shims for routes, controllers, service facades, domain models, and serializers have been removed. The remaining files under `backend/services` are shared cross-service helpers that still need a deeper package split before each service can run with a fully isolated `npm install`.
