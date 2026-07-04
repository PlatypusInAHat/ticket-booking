#!/bin/sh
set -eu

case "${SERVICE_START_SCRIPT:-start}" in
  start)
    exec node server.js
    ;;
  start:all|start:microservices)
    exec node scripts/startMicroservices.js
    ;;
  start:gateway)
    exec node microservices/api-gateway/server.js
    ;;
  start:auth-service)
    exec node microservices/auth-service/server.js
    ;;
  start:catalog-service)
    exec node microservices/catalog-service/server.js
    ;;
  start:booking-service)
    exec node microservices/booking-service/server.js
    ;;
  start:checkin-service)
    exec node microservices/checkin-service/server.js
    ;;
  start:notification-service)
    exec node microservices/notification-service/server.js
    ;;
  seed|seed:microservices)
    exec node scripts/seedMicroservices.js
    ;;
  backfill:events)
    exec node scripts/backfillEvents.js
    ;;
  backfill:passes)
    exec node scripts/backfillPasses.js
    ;;
  security:migrate-secrets)
    exec node scripts/migrateSecrets.js
    ;;
  *)
    echo "Unknown SERVICE_START_SCRIPT: ${SERVICE_START_SCRIPT}" >&2
    exit 64
    ;;
esac
