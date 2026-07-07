module.exports = {
  routes: {
    auth: require('./routes/auth'),
    users: require('./routes/users'),
    admin: require('./routes/admin')
  },
  services: {
    auth: require('./services/authService'),
    user: require('./services/userService'),
    admin: require('./services/adminService')
  },
  models: {
    User: require('./models/User'),
    Session: require('./models/Session')
  }
};
