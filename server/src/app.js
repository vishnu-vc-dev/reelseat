const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const morgan = require('morgan');

const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error');
const { securityHeaders, sanitize, apiLimiter } = require('./middleware/security');

/**
 * Express application.
 * Kept separate from the HTTP server (server.js) so tests can mount it with
 * supertest without opening a port.
 */
const app = express();

/** Behind Render's proxy the real client IP arrives in X-Forwarded-For; rate limiting depends on it. */
if (env.trustProxy) app.set('trust proxy', env.trustProxy);

app.disable('x-powered-by');
app.use(securityHeaders);
app.use(
  cors({
    origin: env.clientUrls,
    credentials: true,
  }),
);
app.use(compression());

/**
 * Razorpay webhooks are verified against the exact raw bytes, so this route
 * must be registered before express.json() consumes and re-serialises the body.
 */
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json', limit: '100kb' }),
  require('./controllers/payment.controller').webhook,
);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());
app.use(sanitize);
if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', uptime: process.uptime() });
});

/** Registers booking side effects (ticket emails) on the booking service's event hooks. */
require('./services/notification.service');

app.use('/api', apiLimiter, require('./routes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
