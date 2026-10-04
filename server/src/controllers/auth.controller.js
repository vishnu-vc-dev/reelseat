const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { setAuthCookie, clearAuthCookie } = require('../utils/token');
const passwordReset = require('../services/passwordReset.service');

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

/**
 * POST /api/auth/forgot-password
 * Always answers the same way whether or not the email exists.
 */
const forgotPassword = asyncHandler(async (req, res) => {
  await passwordReset.requestReset(req.body.email);
  res.json({
    success: true,
    message: 'If an account exists for this email, a reset code has been sent.',
  });
});

/** POST /api/auth/reset-password */
const resetPassword = asyncHandler(async (req, res) => {
  await passwordReset.resetPassword(req.body);
  res.json({ success: true, message: 'Password updated. You can now log in.' });
});

/** PATCH /api/auth/password — change password while logged in. */
const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  user.password = req.body.newPassword;
  await user.save();
  setAuthCookie(res, user);
  res.json({ success: true, message: 'Password changed' });
});

/** PATCH /api/auth/me — update profile fields (email stays fixed as the login id). */
const updateProfile = asyncHandler(async (req, res) => {
  req.user.name = req.body.name;
  await req.user.save();
  res.json({ success: true, message: 'Profile updated', data: req.user });
});

module.exports = { register, login, logout, me, forgotPassword, resetPassword, changePassword, updateProfile };
