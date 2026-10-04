const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const env = require('../config/env');

/**
 * Builds a rate limiter with consistent JSON errors and standard
 * `RateLimit-*` headers. Limits are per client IP, which is why
 * `trust proxy` must be configured correctly behind Render's load balancer.
 * @param {{ windowMinutes: number, limit: number, message: string }} options
 */
function createLimiter({ windowMinutes, limit, message }) {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    /** Automated tests hammer the API on purpose; limits are exercised in a dedicated test instead. */
    skip: () => env.isTest,
    handler: (req, res) => res.status(429).json({ success: false, message }),
  });
}

/** Broad ceiling for every API route. */
const apiLimiter = createLimiter({
  windowMinutes: 15,
  limit: 500,
  message: 'Too many requests, please slow down.',
});

/** Login and registration: slows down credential stuffing. */
const authLimiter = createLimiter({
  windowMinutes: 15,
  limit: 20,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

/** Reset codes cost an email each and are a brute-force target. */
const otpLimiter = createLimiter({
  windowMinutes: 15,
  limit: 5,
  message: 'Too many reset requests. Please try again later.',
});

/**
 * Security headers. The API serves JSON only, so the default helmet policy
 * (which also removes the `X-Powered-By: Express` fingerprint) is a good fit.
 */
const securityHeaders = helmet();

/**
 * Strips keys starting with `$` or containing `.` from body, query and params,
 * so payloads like `{ "email": { "$gt": "" } }` can never reach a Mongo query.
 * zod validation already rejects such shapes; this is defence in depth for
 * any route that might skip validation in the future.
 */
const sanitize = mongoSanitize({ replaceWith: '_' });

module.exports = { createLimiter, apiLimiter, authLimiter, otpLimiter, securityHeaders, sanitize };
