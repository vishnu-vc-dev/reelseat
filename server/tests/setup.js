/**
 * Jest bootstrap: every test file gets its own throwaway in-memory MongoDB,
 * so tests never touch a real database and can run in CI without services.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_test';
/** Never reach real providers from tests, even if a developer's .env has keys. */
process.env.BREVO_API_KEY = '';
process.env.RAZORPAY_KEY_ID = '';
process.env.RAZORPAY_KEY_SECRET = '';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  /** Let fire-and-forget work (ticket emails) finish before wiping the database. */
  await require('../src/services/booking.service').settleSideEffects();
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});
