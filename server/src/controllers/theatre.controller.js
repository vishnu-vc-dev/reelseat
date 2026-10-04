const Theatre = require('../models/Theatre');
const Show = require('../models/Show');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Loads a theatre and asserts the current partner owns it.
 * Admins bypass the ownership check.
 * @param {import('express').Request} req
 */
async function findOwnedTheatre(req) {
  const theatre = await Theatre.findById(req.params.id);
  if (!theatre) throw ApiError.notFound('Theatre not found');
  const isOwner = String(theatre.owner) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw ApiError.forbidden('You do not own this theatre');
  return theatre;
}

/** POST /api/theatres (partner) — new theatres wait for admin approval. */
const createTheatre = asyncHandler(async (req, res) => {
  const theatre = await Theatre.create({ ...req.body, owner: req.user._id, status: 'pending' });
  res.status(201).json({ success: true, message: 'Theatre submitted for approval', data: theatre });
});

/** GET /api/theatres/mine (partner) */
const myTheatres = asyncHandler(async (req, res) => {
  const theatres = await Theatre.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: theatres });
});

/**
 * PATCH /api/theatres/:id (owner)
 * Partners cannot change `status` here — that field is not in the update schema.
 */
const updateTheatre = asyncHandler(async (req, res) => {
  const theatre = await findOwnedTheatre(req);
  Object.assign(theatre, req.body);
  await theatre.save();
  res.json({ success: true, message: 'Theatre updated', data: theatre });
});

/** DELETE /api/theatres/:id (owner) — blocked while upcoming shows exist. */
const deleteTheatre = asyncHandler(async (req, res) => {
  const theatre = await findOwnedTheatre(req);
  const upcoming = await Show.exists({ theatre: theatre._id, startTime: { $gte: new Date() } });
  if (upcoming) throw ApiError.conflict('Cancel upcoming shows before deleting this theatre');

  await theatre.deleteOne();
  res.json({ success: true, message: 'Theatre deleted' });
});

/** GET /api/theatres/cities — public list of cities with at least one approved theatre. */
const listCities = asyncHandler(async (req, res) => {
  const cities = await Theatre.distinct('city', { status: 'approved' });
  res.json({ success: true, data: cities.sort((a, b) => a.localeCompare(b)) });
});

/** GET /api/admin/theatres?status= (admin) */
const adminListTheatres = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const theatres = await Theatre.find(filter).populate('owner', 'name email').sort({ createdAt: -1 });
  res.json({ success: true, data: theatres });
});

/** PATCH /api/admin/theatres/:id/status (admin) — approve, block or reset to pending. */
const updateTheatreStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  const theatre = await Theatre.findByIdAndUpdate(
    req.params.id,
    { status, statusReason: status === 'blocked' ? reason : undefined },
    { new: true },
  ).populate('owner', 'name email');
  if (!theatre) throw ApiError.notFound('Theatre not found');
  res.json({ success: true, message: `Theatre ${status}`, data: theatre });
});

module.exports = {
  createTheatre,
  myTheatres,
  updateTheatre,
  deleteTheatre,
  listCities,
  adminListTheatres,
  updateTheatreStatus,
};
