/**
 * Zero-setup development server.
 *
 * Starts an in-memory MongoDB, seeds demo data and boots the API, so the
 * project runs on a fresh machine with nothing but Node installed.
 * Data lives only as long as the process.
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri('bookmyshow');
  console.log('In-memory MongoDB started');

  const mongoose = require('mongoose');
  const { seed } = require('./seed');
  await mongoose.connect(process.env.MONGO_URI);
  await seed({ log: (msg) => console.log(`  seeded ${msg}`) });
  await mongoose.disconnect();

  require('../src/server');

  const stop = async () => {
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
