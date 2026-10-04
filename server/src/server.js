const http = require('http');

const env = require('./config/env');
const { connectDB } = require('./config/db');
const app = require('./app');

async function start() {
  await connectDB(env.mongoUri);

  const server = http.createServer(app);
  server.listen(env.port, () => {
    console.log(`API listening on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
