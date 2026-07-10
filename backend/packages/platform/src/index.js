const defineLazyExport = (target, key, loader) => {
  Object.defineProperty(target, key, {
    enumerable: true,
    get: loader
  });
};

defineLazyExport(module.exports, 'cryptoUtils', () => require('./lib/cryptoUtils'));
defineLazyExport(module.exports, 'passUtils', () => require('./lib/passUtils'));
defineLazyExport(module.exports, 'securityUtils', () => require('./lib/securityUtils'));
defineLazyExport(module.exports, 'serviceUrl', () => require('./lib/serviceUrl'));
defineLazyExport(module.exports, 'domainEvents', () => require('./lib/domainEvents'));
defineLazyExport(module.exports, 'createInternalHttpRequester', () => require('./lib/internalHttpClient').createInternalHttpRequester);
defineLazyExport(module.exports, 'publishDomainEvent', () => require('./lib/domainEventPublisher').publishDomainEvent);
defineLazyExport(module.exports, 'internalAuth', () => require('./lib/internalAuth'));
defineLazyExport(module.exports, 'logger', () => require('./lib/logger'));
defineLazyExport(module.exports, 'emailService', () => require('./lib/emailService'));
defineLazyExport(module.exports, 'slugify', () => require('./lib/slugify'));
defineLazyExport(module.exports, 'cache', () => require('./lib/cache'));
defineLazyExport(module.exports, 'mediaStorage', () => require('./lib/mediaStorage'));
defineLazyExport(module.exports, 'botProtectionService', () => require('./lib/botProtectionService'));
defineLazyExport(module.exports, 'corsOptions', () => require('./lib/corsOptions'));
