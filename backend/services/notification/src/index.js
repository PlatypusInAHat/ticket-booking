module.exports = {
  routes: {
    notifications: require('./routes/notifications'),
    internalNotifications: require('./routes/internal/notifications')
  },
  services: {
    emailQueue: require('./services/emailQueueService'),
    notificationEvents: require('./services/notificationEventService')
  },
  models: {
    EmailJob: require('./models/EmailJob'),
    EmailLog: require('./models/EmailLog'),
    EmailPreference: require('./models/EmailPreference'),
    EmailSuppression: require('./models/EmailSuppression'),
    EmailTemplate: require('./models/EmailTemplate'),
    MarketingCampaign: require('./models/MarketingCampaign')
  }
};
