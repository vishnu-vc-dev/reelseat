const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex } = require('../utils/regex');
const Movie = require('../models/Movie');
const Theatre = require('../models/Theatre');
const analytics = require('../services/analytics.service');

/** GET /api/admin/users?role=&search= */
const listUsers = asyncHandler(async (req, res) => {
  const { role, search } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (search) {
    const re = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: re }, { email: re }];
  }
  const users = await User.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, data: users });
});

/**
 * PATCH /api/admin/users/:id/status
 * Deactivated users are rejected by the `protect` middleware on their next request.
 */
const setUserActive = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    throw ApiError.badRequest('You cannot deactivate your own account');
  }
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true });
  if (!user) throw ApiError.notFound('User not found');
  res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, data: user });
});

/** GET /api/admin/stats — platform-wide KPIs for the admin dashboard. */
const stats = asyncHandler(async (req, res) => {
  const [users, theatres, movies, summary, daily, top] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Theatre.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Movie.countDocuments({ isActive: true }),
    analytics.totals({}),
    analytics.dailyRevenue({}, 14),
    analytics.topMovies({}, 5),
  ]);

  const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));
  res.json({
    success: true,
    data: { users: toMap(users), theatres: toMap(theatres), activeMovies: movies, summary, daily, topMovies: top },
  });
});

module.exports = { listUsers, setUserActive, stats };
