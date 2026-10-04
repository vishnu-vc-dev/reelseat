const Booking = require('../models/Booking');
const Show = require('../models/Show');
const { istDayRange } = require('../utils/time');

const TZ = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Revenue and ticket counts per IST day for the last `days` days.
 * Days without sales are filled with zeros so charts have a continuous axis.
 * @param {object} match extra $match conditions (e.g. restrict to a partner's theatres)
 * @param {number} days
 */
async function dailyRevenue(match, days = 14) {
  /** Window starts at IST midnight `days - 1` days ago, independent of the server's timezone. */
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });
  const { start: since } = istDayRange(fmt.format(new Date(Date.now() - (days - 1) * DAY_MS)));

  const rows = await Booking.aggregate([
    { $match: { ...match, status: 'CONFIRMED', confirmedAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$confirmedAt', timezone: TZ } },
        revenue: { $sum: '$ticketAmount' },
        tickets: { $sum: { $size: '$seats' } },
      },
    },
  ]);

  const byDay = new Map(rows.map((r) => [r._id, r]));
  return Array.from({ length: days }, (_, i) => {
    const date = fmt.format(new Date(since.getTime() + i * DAY_MS));
    const row = byDay.get(date);
    return { date, revenue: row?.revenue || 0, tickets: row?.tickets || 0 };
  });
}

/**
 * Best selling movies by revenue.
 * @param {object} match
 * @param {number} limit
 */
function topMovies(match, limit = 5) {
  return Booking.aggregate([
    { $match: { ...match, status: 'CONFIRMED' } },
    { $group: { _id: '$movie', revenue: { $sum: '$ticketAmount' }, tickets: { $sum: { $size: '$seats' } } } },
    { $sort: { revenue: -1 } },
    { $limit: limit },
    { $lookup: { from: 'movies', localField: '_id', foreignField: '_id', as: 'movie' } },
    { $unwind: '$movie' },
    { $project: { _id: 0, movieId: '$_id', title: '$movie.title', revenue: 1, tickets: 1 } },
  ]);
}

/**
 * Totals: confirmed bookings, tickets sold, ticket revenue and fees.
 * @param {object} match
 */
async function totals(match) {
  const [row] = await Booking.aggregate([
    { $match: { ...match, status: 'CONFIRMED' } },
    {
      $group: {
        _id: null,
        bookings: { $sum: 1 },
        tickets: { $sum: { $size: '$seats' } },
        revenue: { $sum: '$ticketAmount' },
        fees: { $sum: '$convenienceFee' },
      },
    },
  ]);
  return { bookings: row?.bookings || 0, tickets: row?.tickets || 0, revenue: row?.revenue || 0, fees: row?.fees || 0 };
}

/**
 * Occupancy of upcoming shows for the given theatres.
 * @param {import('mongoose').Types.ObjectId[]} theatreIds
 */
async function upcomingOccupancy(theatreIds, limit = 10) {
  const shows = await Show.find({ theatre: { $in: theatreIds }, startTime: { $gte: new Date() }, isCancelled: false })
    .populate('movie', 'title')
    .populate('theatre', 'name')
    .sort({ startTime: 1 })
    .limit(limit);

  return shows.map((s) => ({
    showId: s._id,
    movie: s.movie?.title,
    theatre: s.theatre?.name,
    startTime: s.startTime,
    screen: s.screen,
    booked: s.bookedSeats.length,
    total: s.totalSeats,
    occupancy: s.totalSeats ? Math.round((s.bookedSeats.length / s.totalSeats) * 100) : 0,
  }));
}

module.exports = { dailyRevenue, topMovies, totals, upcomingOccupancy };
