const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { setAuthCookie, clearAuthCookie } = require('../utils/token');

/**
 * POST /api/auth/register
 * Creates a customer or partner account and logs the user in straight away.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const exists = await User.exists({ email });
  if (exists) throw ApiError.conflict('An account with this email already exists');

  const user = await User.create({ name, email, password, role });
  setAuthCookie(res, user);

  res.status(201).json({ success: true, message: 'Registration successful', data: user });
});

/**
 * POST /api/auth/login
 * The same generic message is returned for unknown email and wrong password
 * so the endpoint cannot be used to enumerate registered accounts.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  const valid = user && (await user.comparePassword(password));
  if (!valid) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled');

  setAuthCookie(res, user);
  res.json({ success: true, message: 'Logged in', data: user });
});

/** POST /api/auth/logout */
const logout = (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Logged out' });
};

/** GET /api/auth/me — used by the SPA on load to restore the session. */
const me = (req, res) => {
  res.json({ success: true, data: req.user });
};

module.exports = { register, login, logout, me };
