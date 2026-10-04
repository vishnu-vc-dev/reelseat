const Movie = require('../models/Movie');
const Show = require('../models/Show');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { exactInsensitive } = require('../utils/regex');

/**
 * GET /api/movies
 * Public catalogue with full-text search, genre/language filters, a
 * "now showing / upcoming" switch and pagination.
 */
const listMovies = asyncHandler(async (req, res) => {
  const { search, genre, language, status, page, limit, includeInactive } = req.query;
  const filter = {};

  /** Only admins may see deactivated titles. */
  if (!(includeInactive && req.user?.role === 'admin')) filter.isActive = true;
  if (search) filter.$text = { $search: search };
  if (genre) filter.genres = exactInsensitive(genre);
  if (language) filter.languages = exactInsensitive(language);
  if (status === 'now') filter.releaseDate = { $lte: new Date() };
  if (status === 'upcoming') filter.releaseDate = { $gt: new Date() };

  const sort = search ? { score: { $meta: 'textScore' } } : { releaseDate: -1 };
  const projection = search ? { score: { $meta: 'textScore' } } : {};

  const [items, total] = await Promise.all([
    Movie.find(filter, projection)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit),
    Movie.countDocuments(filter),
  ]);

  res.json({ success: true, data: items, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
});

/** GET /api/movies/filters — distinct genres and languages for the filter chips. */
const getFilters = asyncHandler(async (req, res) => {
  const [genres, languages] = await Promise.all([
    Movie.distinct('genres', { isActive: true }),
    Movie.distinct('languages', { isActive: true }),
  ]);
  res.json({ success: true, data: { genres: genres.sort(), languages: languages.sort() } });
});

/** GET /api/movies/:id */
const getMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findById(req.params.id);
  if (!movie || (!movie.isActive && req.user?.role !== 'admin')) throw ApiError.notFound('Movie not found');
  res.json({ success: true, data: movie });
});

/** POST /api/movies (admin) */
const createMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.create(req.body);
  res.status(201).json({ success: true, message: 'Movie added', data: movie });
});

/** PATCH /api/movies/:id (admin) */
const updateMovie = asyncHandler(async (req, res) => {
  const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!movie) throw ApiError.notFound('Movie not found');
  res.json({ success: true, message: 'Movie updated', data: movie });
});

/**
 * DELETE /api/movies/:id (admin)
 * Movies with scheduled shows cannot be removed, otherwise existing bookings
 * would point at nothing. Admins should deactivate them instead.
 */
const deleteMovie = asyncHandler(async (req, res) => {
  const hasShows = await Show.exists({ movie: req.params.id });
  if (hasShows) throw ApiError.conflict('Movie has shows scheduled. Deactivate it instead of deleting.');

  const movie = await Movie.findByIdAndDelete(req.params.id);
  if (!movie) throw ApiError.notFound('Movie not found');
  res.json({ success: true, message: 'Movie deleted' });
});

module.exports = { listMovies, getFilters, getMovie, createMovie, updateMovie, deleteMovie };
