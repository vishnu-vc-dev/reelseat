const jwt = require('jsonwebtoken');
const env = require('../config/env');

const COOKIE_NAME = 'token';

/**
 * Signs a JWT for the given user.
 * Only the id and role are embedded; everything else is loaded fresh per request.
 * @param {{ _id: any, role: string }} user
 */
function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

/** @param {string} token */
function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

/**
 * Cookie options for the auth token.
 * httpOnly keeps the JWT away from JavaScript (XSS), sameSite=lax blocks CSRF
 * on state-changing cross-site requests. In production the frontend proxies
 * /api through the same origin, so a first-party lax cookie is sufficient.
 */
function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  };
}

/**
 * Issues the auth cookie on the response.
 * @param {import('express').Response} res
 * @param {{ _id: any, role: string }} user
 */
function setAuthCookie(res, user) {
  res.cookie(COOKIE_NAME, signToken(user), cookieOptions());
}

/** @param {import('express').Response} res */
function clearAuthCookie(res) {
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE_NAME, options);
}

module.exports = { COOKIE_NAME, signToken, verifyToken, setAuthCookie, clearAuthCookie };
