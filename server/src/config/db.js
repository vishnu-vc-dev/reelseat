const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

/**
 * Opens the Mongoose connection.
 * @param {string} uri MongoDB connection string (Atlas or the in-memory dev server)
 */
async function connectDB(uri) {
  if (!uri) throw new Error('MONGO_URI is not set');
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  return mongoose.connection;
}

/** Closes the Mongoose connection (used by tests and graceful shutdown). */
async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
