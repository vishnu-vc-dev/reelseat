const Theatre = require('../models/Theatre');
const Booking = require('../models/Booking');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const analytics = require('../services/analytics.service');
const { verifyTicket } = require('../services/ticket.service');

/** Ids of every theatre the current partner owns. */
async function ownedTheatreIds(user) {
  const theatres = await Theatre.find({ owner: user._id }).select('_id');
  return theatres.map((t) => t._id);
}

/** GET /api/partner/stats — revenue, ticket sales and occupancy across the partner's theatres. */
const stats = asyncHandler(async (req, res) => {
  const ids = await ownedTheatreIds(req.user);
  const match = { theatre: { $in: ids } };

  const [summary, daily, movies, upcoming, theatres] = await Promise.all([
    analytics.totals(match),
    analytics.dailyRevenue(match, 14),
    analytics.topMovies(match, 5),
    analytics.upcomingOccupancy(ids, 10),
    Theatre.aggregate([{ $match: { owner: req.user._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  res.json({
    success: true,
    data: {
      summary,
      theatres: Object.fromEntries(theatres.map((t) => [t._id, t.count])),
      daily,
      topMovies: movies,
      upcoming,
    },
  });
});

/** GET /api/partner/bookings?show= — confirmed bookings for the partner's shows. */
const bookings = asyncHandler(async (req, res) => {
  const ids = await ownedTheatreIds(req.user);
  const filter = { theatre: { $in: ids }, status: 'CONFIRMED' };
  if (req.query.show) filter.show = req.query.show;

  const list = await Booking.find(filter)
    .populate('user', 'name email')
    .populate('movie', 'title')
    .populate('show', 'startTime screen')
    .sort({ confirmedAt: -1 })
    .limit(200);
  res.json({ success: true, data: list });
});

/**
 * POST /api/partner/checkin — validates a scanned ticket at the gate.
 * Accepts either the signed QR payload or the printed ticket code.
 * A ticket can be admitted only once.
 */
const checkIn = asyncHandler(async (req, res) => {
  const input = req.body.code.trim();
  const bookingId = verifyTicket(input);
  const filter = bookingId ? { _id: bookingId } : { ticketCode: input.toUpperCase() };

  const booking = await Booking.findOne(filter)
    .populate('user', 'name')
    .populate('movie', 'title')
    .populate('show', 'startTime screen')
    .populate('theatre', 'name owner');
  if (!booking) throw ApiError.notFound('Invalid ticket');

  if (String(booking.theatre.owner) !== String(req.user._id) && req.user.role !== 'admin') {
    throw ApiError.forbidden('This ticket is for another theatre');
  }
  if (booking.status !== 'CONFIRMED') throw ApiError.badRequest(`Ticket is ${booking.status.toLowerCase()}`);
  if (booking.checkedInAt) {
    throw ApiError.conflict(`Already admitted at ${booking.checkedInAt.toISOString()}`, { booking });
  }

  booking.checkedInAt = new Date();
  await booking.save();
  res.json({ success: true, message: 'Admitted', data: booking });
});

module.exports = { stats, bookings, checkIn };
