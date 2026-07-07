module.exports = {
  routes: {
    checkin: require('./routes/checkin'),
    internalCheckin: require('./routes/internal/checkin')
  },
  services: {
    checkin: require('./services/checkinService')
  },
  models: {
    CheckInDevice: require('./models/CheckInDevice'),
    CheckInLog: require('./models/CheckInLog')
  }
};
