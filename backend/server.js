const { startMicroservices } = require('./scripts/startMicroservices');

if (require.main === module) {
  startMicroservices();
}

module.exports = {
  startMicroservices
};
