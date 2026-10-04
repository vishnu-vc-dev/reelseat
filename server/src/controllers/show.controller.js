const Show = require('../models/Show');
const Movie = require('../models/Movie');
const Theatre = require('../models/Theatre');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { DEFAULT_LAYOUT, assertValidLayout } = require('../utils/seats');
const { istDayRange, todayIST } = require('../utils/time');
const { exactInsensitive } = require('../utils/regex');

/** Time reserved between screenings for cleaning and audience changeover. */
const CLEANING_BUFFER_MINUTES = 15;

/**
 * Asserts the partner owns an approved theatre and that the screen exists.
 * @param {import('express').Request} req
 * @param {string} theatreId
 * @param {number} screen
 */
async function assertBookableTheatre(req, theatreId, screen) {
  const theatre = await Theatre.findById(theatreId);
  if (!theatre) throw ApiError.notFound('Theatre not found');
  if (String(theatre.owner) !== String(req.user._id) && req.user.role !== 'admin') {
    throw ApiError.forbidden('You do not own this theatre');
  }
  if (theatre.status !== 'approved') throw ApiError.badRequest('Theatre must be approved before adding shows');
  if (screen > theatre.screens) throw ApiError.badRequest(`Theatre only has ${theatre.screens} screen(s)`);
  return theatre;
}

/**
 * Rejects a schedule that overlaps another show on the same screen.
 * Two intervals overlap when each starts before the other ends.
 */
async function assertNoOverlap({ theatre, screen, startTime, endTime, excludeId }) {
  const clash = await Show.findOne({
    theatre,
    screen,
    isCancelled: false,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
    ...(excludeId && { _id: { $ne: excludeId } }),
  }).populate('movie', 'title');

  if (clash) {
    throw ApiError.conflict(
      `Screen ${screen} is busy with "${clash.movie?.title}" at ${clash.startTime.toISOString()}`,
    );
  }
}

function computeEndTime(startTime, durationMinutes) {
  return new Date(startTime.getTime() + (durationMinutes + CLEANING_BUFFER_MINUTES) * 60 * 1000);
}

/** POST /api/shows (partner) */
const createShow = asyncHandler(async (req, res) => {
  const { movie: movieId, theatre: theatreId, screen, startTime, language, format } = req.body;
  const seatLayout = req.body.seatLayout || DEFAULT_LAYOUT;

  if (startTime <= new Date()) throw ApiError.badRequest('Show time must be in the future');
  assertValidLayout(seatLayout);
  await assertBookableTheatre(req, theatreId, screen);

  const movie = await Movie.findById(movieId);
  if (!movie || !movie.isActive) throw ApiError.badRequest('Movie is not available');
  if (movie.languages.length && !movie.languages.some((l) => l.toLowerCase() === language.toLowerCase())) {
    throw ApiError.badRequest(`Movie is available in: ${movie.languages.join(', ')}`);
  }

  const endTime = computeEndTime(startTime, movie.durationMinutes);
  await assertNoOverlap({ theatre: theatreId, screen, startTime, endTime });

  const show = await Show.create({
    movie: movieId,
    theatre: theatreId,
    screen,
    startTime,
    endTime,
    language,
    format,
    seatLayout,
  });
  res.status(201).json({ success: true, message: 'Show scheduled', data: show });
});

/** GET /api/shows/mine?theatre=&upcoming= (partner) */
const myShows = asyncHandler(async (req, res) => {
  const theatres = await Theatre.find({ owner: req.user._id }).select('_id');
  let ids = theatres.map((t) => t._id);
  /** Filtering inside the owned set means a partner can never read another partner's shows. */
  if (req.query.theatre) ids = ids.filter((id) => String(id) === req.query.theatre);

  const filter = { theatre: { $in: ids } };
  if (req.query.upcoming) filter.startTime = { $gte: new Date() };

  const shows = await Show.find(filter)
    .populate('movie', 'title posterUrl durationMinutes')
    .populate('theatre', 'name city')
    .sort({ startTime: 1 });
  res.json({ success: true, data: shows });
});

/**
 * PATCH /api/shows/:id (partner)
 * Before any ticket is sold everything can change. Afterwards only prices may,
 * because moving the time or the layout would invalidate issued tickets.
 */
const updateShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id).populate('movie', 'durationMinutes');
  if (!show) throw ApiError.notFound('Show not found');
  await assertBookableTheatre(req, show.theatre, req.body.screen ?? show.screen);

  const hasBookings = show.bookedSeats.length > 0;
  if (hasBookings) {
    const touched = Object.keys(req.body).filter((k) => k !== 'seatLayout');
    if (touched.length) throw ApiError.conflict('Tickets are sold; only seat prices can be changed');
    if (req.body.seatLayout) {
      const sameShape =
        req.body.seatLayout.seatsPerRow === show.seatLayout.seatsPerRow &&
        JSON.stringify(req.body.seatLayout.categories.map((c) => c.rows)) ===
          JSON.stringify(show.seatLayout.categories.map((c) => c.rows));
      if (!sameShape) throw ApiError.conflict('Tickets are sold; the seat layout cannot change');
    }
  }

  if (req.body.seatLayout) assertValidLayout(req.body.seatLayout);
  Object.assign(show, req.body);

  if (req.body.startTime || req.body.screen) {
    if (show.startTime <= new Date()) throw ApiError.badRequest('Show time must be in the future');
    show.endTime = computeEndTime(show.startTime, show.movie.durationMinutes);
    await assertNoOverlap({
      theatre: show.theatre,
      screen: show.screen,
      startTime: show.startTime,
      endTime: show.endTime,
      excludeId: show._id,
    });
  }

  await show.save();
  res.json({ success: true, message: 'Show updated', data: show });
});

/** DELETE /api/shows/:id (partner) — only shows without sold tickets can be removed. */
const deleteShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id);
  if (!show) throw ApiError.notFound('Show not found');
  const theatre = await Theatre.findById(show.theatre);
  if (String(theatre?.owner) !== String(req.user._id) && req.user.role !== 'admin') throw ApiError.forbidden();
  if (show.bookedSeats.length) throw ApiError.conflict('Tickets are already sold for this show');

  await show.deleteOne();
  res.json({ success: true, message: 'Show deleted' });
});

/**
 * GET /api/shows/movie/:movieId?date=YYYY-MM-DD&city=
 * Public showtimes for one movie on one IST day, grouped by theatre.
 * Only approved theatres and future, non-cancelled shows are returned.
 */
const showsForMovie = asyncHandler(async (req, res) => {
  const date = req.query.date || todayIST();
  const { start, end } = istDayRange(date);
  const from = start < new Date() ? new Date() : start;

  const theatreFilter = { status: 'approved' };
  if (req.query.city) theatreFilter.city = exactInsensitive(req.query.city);
  const theatres = await Theatre.find(theatreFilter).select('name address city');
  const theatreById = new Map(theatres.map((t) => [String(t._id), t]));

  const shows = await Show.find({
    movie: req.params.movieId,
    theatre: { $in: theatres.map((t) => t._id) },
    isCancelled: false,
    startTime: { $gte: from, $lt: end },
  })
    .select('theatre screen startTime language format seatLayout bookedSeats')
    .sort({ startTime: 1 });

  const grouped = new Map();
  for (const show of shows) {
    const key = String(show.theatre);
    if (!grouped.has(key)) grouped.set(key, { theatre: theatreById.get(key), shows: [] });
    const total = show.totalSeats;
    grouped.get(key).shows.push({
      _id: show._id,
      screen: show.screen,
      startTime: show.startTime,
      language: show.language,
      format: show.format,
      minPrice: Math.min(...show.seatLayout.categories.map((c) => c.price)),
      availableSeats: total - show.bookedSeats.length,
      totalSeats: total,
    });
  }

  res.json({ success: true, data: { date, theatres: [...grouped.values()] } });
});

/** GET /api/shows/:id — full show details used by the seat selection page. */
const getShow = asyncHandler(async (req, res) => {
  const show = await Show.findById(req.params.id)
    .populate('movie', 'title posterUrl durationMinutes certificate languages genres')
    .populate('theatre', 'name address city status');
  if (!show || show.isCancelled || show.theatre?.status !== 'approved') throw ApiError.notFound('Show not found');
  res.json({ success: true, data: show });
});

module.exports = { createShow, myShows, updateShow, deleteShow, showsForMovie, getShow };
