require('./newrelic');
const bootService = require('@parameter1/terminus/boot-service');
const { log } = require('@parameter1/terminus/utils');
const { buildIndexes, filterUri } = require('@parameter1/omeda-mongodb');
const newrelic = require('./newrelic');
const mongodb = require('./mongodb');
const server = require('./server');
const pkg = require('../package.json');
const { HOST, PORT, isDevelopment } = require('./env');

process.on('unhandledRejection', (e) => {
  newrelic.noticeError(e);
  throw e;
});

bootService({
  name: pkg.name,
  version: pkg.version,
  server,
  host: HOST,
  port: PORT,
  onError: newrelic.noticeError.bind(newrelic),
  onStart: async () => {
    await mongodb.connect().then((client) => log(`MongoDB connected ${filterUri(client)}`));
    if (isDevelopment) {
      log('Creating MongoDB indexes...');
      await buildIndexes({ client: mongodb });
      log('Indexes created.');
    }
  },
  onSignal: () => mongodb.close(),
  onHealthCheck: () => mongodb.command({ ping: 1 }),
}).catch((e) => setImmediate(() => {
  newrelic.noticeError(e);
  throw e;
}));
