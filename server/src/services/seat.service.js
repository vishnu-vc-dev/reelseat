const Show = require('../models/Show');
const SeatHold = require('../models/SeatHold');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { priceSeats } = require('../utils/seats');
const { emitToShow } = require('../sockets');

/** Customers cannot start a booking this close to show time. */
const BOOKING_CUTOFF_MINUTES = 10;

/**
 * Loads a show and checks it can still be booked.
 * @param {string} showId
 */
async function loadBookableShow(showId) {
  const show = await Show.findById(showId).populate('theatre', 'status name');
  if (!show || show.isCancelled || show.theatre?.status !== 'approved') throw ApiError.notFound('Show not found');
  const cutoff = new Date(show.startTime.getTime() - BOOKING_CUTOFF_MINUTES * 60 * 1000);
  if (new Date() > cutoff) throw ApiError.badRequest('Booking for this show has closed');
  return show;
}

/**
 * Current seat availability: sold seats plus seats temporarily held by others.
 * @param {string} showId
 * @param {string} [userId] when given, the caller's own holds are flagged `mine`
 */
async function getAvailability(showId, userId) {
  const show = await Show.findById(showId).select('bookedSeats');
  if (!show) throw ApiError.notFound('Show not found');

  const holds = await SeatHold.find({ show: showId, expiresAt: { $gt: new Date() } }).select('seat user expiresAt');
  return {
    booked: show.bookedSeats,
    held: holds.map((h) => ({
      seat: h.seat,
      expiresAt: h.expiresAt,
      mine: Boolean(userId) && String(h.user) === String(userId),
    })),
  };
}

/**
 * Atomically holds the requested seats for a user.
 *
 * The user's previous holds on this show are replaced, so the hold always
 * mirrors their current selection. Acquisition relies on the unique
 * (show, seat) index: inserts are unordered, and if any seat is already held
 * by someone else the successful inserts from this attempt are rolled back.
 *
 * @param {string} showId
 * @param {import('mongoose').Types.ObjectId} userId
 * @param {string[]} seatIds
 */
async function holdSeats(showId, userId, seatIds) {
  const show = await loadBookableShow(showId);
  const { seats, items, total } = priceSeats(show.seatLayout, seatIds);

  const sold = seats.filter((s) => show.bookedSeats.includes(s));
  if (sold.length) throw ApiError.conflict(`Already booked: ${sold.join(', ')}`, { seats: sold });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.seatHoldMinutes * 60 * 1000);

  const previous = await SeatHold.find({ show: showId, user: userId }).select('seat');
  await SeatHold.deleteMany({ show: showId, user: userId });
  /** Expired holds may linger until the TTL monitor runs; clear them so they don't block inserts. */
  await SeatHold.deleteMany({ show: showId, seat: { $in: seats }, expiresAt: { $lte: now } });

  try {
    await SeatHold.insertMany(
      seats.map((seat) => ({ show: showId, seat, user: userId, expiresAt })),
      { ordered: false },
    );
  } catch (err) {
    if (err.code !== 11000 && !err.writeErrors) throw err;
    await SeatHold.deleteMany({ show: showId, user: userId });
    const taken = await SeatHold.find({ show: showId, seat: { $in: seats } }).distinct('seat');
    notifyReleased(showId, previous.map((h) => h.seat));
    throw ApiError.conflict(`Someone else is holding: ${taken.join(', ')}`, { seats: taken });
  }

  const released = previous.map((h) => h.seat).filter((s) => !seats.includes(s));
  notifyReleased(showId, released);
  emitToShow(showId, 'seats:held', { seats, expiresAt });

  return { seats, items, total, expiresAt };
}

/**
 * Releases every hold the user has on a show (e.g. they navigated away).
 * @param {string} showId
 * @param {import('mongoose').Types.ObjectId} userId
 */
async function releaseHolds(showId, userId) {
  const holds = await SeatHold.find({ show: showId, user: userId }).select('seat');
  if (!holds.length) return [];
  await SeatHold.deleteMany({ show: showId, user: userId });
  const seats = holds.map((h) => h.seat);
  notifyReleased(showId, seats);
  return seats;
}

/**
 * Returns the user's live holds for a show, or throws if they lapsed.
 * Used right before payment to make sure the seats are still reserved.
 */
async function assertActiveHold(showId, userId, seatIds) {
  const holds = await SeatHold.find({
    show: showId,
    user: userId,
    seat: { $in: seatIds },
    expiresAt: { $gt: new Date() },
  });
  if (holds.length !== seatIds.length) {
    throw ApiError.conflict('Your seat hold has expired. Please select your seats again.');
  }
  return holds;
}

function notifyReleased(showId, seats) {
  if (seats.length) emitToShow(showId, 'seats:released', { seats });
}

/**
 * Deletes lapsed holds and tells viewers those seats are free again.
 * Runs on an interval because MongoDB's TTL monitor is coarse and silent.
 */
async function sweepExpiredHolds() {
  const expired = await SeatHold.find({ expiresAt: { $lte: new Date() } }).select('show seat');
  if (!expired.length) return 0;

  await SeatHold.deleteMany({ _id: { $in: expired.map((h) => h._id) } });
  const byShow = new Map();
  for (const hold of expired) {
    const key = String(hold.show);
    byShow.set(key, [...(byShow.get(key) || []), hold.seat]);
  }
  byShow.forEach((seats, showId) => notifyReleased(showId, seats));
  return expired.length;
}

module.exports = {
  BOOKING_CUTOFF_MINUTES,
  loadBookableShow,
  getAvailability,
  holdSeats,
  releaseHolds,
  assertActiveHold,
  sweepExpiredHolds,
};
