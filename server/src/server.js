const http = require('http');

const env = require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');
const { initSocket } = require('./sockets');
const { sweepExpiredHolds } = require('./services/seat.service');

/** How often lapsed seat holds are cleared and broadcast as released. */
const HOLD_SWEEP_INTERVAL_MS = 15 * 1000;

/**
 * Boots the API: connects to MongoDB first, then starts listening.
 * Failing fast on a bad connection string beats serving 500s later.
 */
async function start() {
  await connectDB(env.mongoUri);

  const server = http.createServer(app);
  initSocket(server);

  const sweeper = setInterval(() => {
    sweepExpiredHolds().catch((err) => console.error('Seat hold sweep failed:', err.message));
  }, HOLD_SWEEP_INTERVAL_MS);
  sweeper.unref();

  server.listen(env.port, () => {
    console.log(`API listening on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    clearInterval(sweeper);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
