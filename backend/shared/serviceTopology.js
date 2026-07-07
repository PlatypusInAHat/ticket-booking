module.exports = {
  'api-gateway': {
    packageDir: 'services/api-gateway',
    dockerfile: 'services/api-gateway/Dockerfile',
    image: 'ticket-booking-api-gateway',
    port: 5000,
    startScript: 'node microservices/api-gateway/server.js'
  },
  'auth-service': {
    packageDir: 'services/auth',
    dockerfile: 'services/auth/Dockerfile',
    image: 'ticket-booking-auth-service',
    port: 5101,
    startScript: 'node microservices/auth-service/server.js'
  },
  'catalog-service': {
    packageDir: 'services/catalog',
    dockerfile: 'services/catalog/Dockerfile',
    image: 'ticket-booking-catalog-service',
    port: 5102,
    startScript: 'node microservices/catalog-service/server.js'
  },
  'booking-service': {
    packageDir: 'services/booking',
    dockerfile: 'services/booking/Dockerfile',
    image: 'ticket-booking-booking-service',
    port: 5103,
    startScript: 'node microservices/booking-service/server.js'
  },
  'checkin-service': {
    packageDir: 'services/checkin',
    dockerfile: 'services/checkin/Dockerfile',
    image: 'ticket-booking-checkin-service',
    port: 5104,
    startScript: 'node microservices/checkin-service/server.js'
  },
  'notification-service': {
    packageDir: 'services/notification',
    dockerfile: 'services/notification/Dockerfile',
    image: 'ticket-booking-notification-service',
    port: 5105,
    startScript: 'node microservices/notification-service/server.js'
  }
};
