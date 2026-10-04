const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex } = require('../utils/regex');

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

module.exports = { listUsers, setUserActive };
