const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { COOKIE_NAME, verifyToken } = require('../utils/token');

/**
 * Pulls the JWT from the httpOnly cookie, falling back to a Bearer header
 * so API clients such as Postman can authenticate too.
 * @param {import('express').Request} req
 */
function extractToken(req) {
  if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/**
 * Requires a valid session. Attaches the fresh user document to `req.user`.
 * The user is re-read from the database so that role changes or deactivation
 * take effect immediately, not when the token expires.
 */
const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Session expired, please log in again');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account not found or disabled');

  req.user = user;
  next();
});

/**
 * Role-based guard. Must run after `protect`.
 * @param {...('user'|'partner'|'admin')} roles
 * @returns {import('express').RequestHandler}
 */
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    return next();
  };

module.exports = { protect, authorize };
