require('dotenv').config({ quiet: true });

/**
 * Centralised access to environment variables.
 * Every other module reads configuration from here instead of `process.env`,
 * so defaults and production guards live in one place.
 */
const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 8080,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  seatHoldMinutes: Number(process.env.SEAT_HOLD_MINUTES) || 5,
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
  },
  email: {
    brevoApiKey: process.env.BREVO_API_KEY,
    from: process.env.EMAIL_FROM || 'no-reply@reelseat.local',
    fromName: process.env.EMAIL_FROM_NAME || 'ReelSeat',
  },
  ticketSecret: process.env.TICKET_SECRET || process.env.JWT_SECRET || 'dev-ticket-secret',
};

env.isProd = env.nodeEnv === 'production';
env.isTest = env.nodeEnv === 'test';

if (env.isProd && (!process.env.JWT_SECRET || !env.mongoUri)) {
  throw new Error('JWT_SECRET and MONGO_URI must be set in production');
}

module.exports = env;
