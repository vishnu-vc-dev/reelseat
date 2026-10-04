const mongoose = require('mongoose');
const Review = require('../models/Review');
const Movie = require('../models/Movie');
const Booking = require('../models/Booking');
const ApiError = require('../utils/ApiError');

/**
 * A customer may review a movie only after watching it: they need a
 * confirmed booking for a show of that movie that has already started.
 * This keeps ratings from being gamed by people who never bought a ticket.
 * @param {import('mongoose').Types.ObjectId} userId
 * @param {string} movieId
 */
async function hasWatched(userId, movieId) {
  const bookings = await Booking.find({ user: userId, movie: movieId, status: 'CONFIRMED' })
    .select('show')
    .populate('show', 'startTime');
  return bookings.some((b) => b.show && b.show.startTime <= new Date());
}

/**
 * Recomputes the movie's average rating and review count.
 * @param {string|import('mongoose').Types.ObjectId} movieId
 */
async function refreshSummary(movieId) {
  const [row] = await Review.aggregate([
    { $match: { movie: new mongoose.Types.ObjectId(String(movieId)) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Movie.updateOne(
    { _id: movieId },
    { ratingAverage: row ? Math.round(row.avg * 10) / 10 : 0, ratingCount: row?.count || 0 },
  );
}

/**
 * Creates or updates the caller's review.
 * @param {import('mongoose').Types.ObjectId} userId
 * @param {string} movieId
 * @param {{ rating: number, comment?: string }} input
 */
async function upsertReview(userId, movieId, { rating, comment }) {
  if (!(await Movie.exists({ _id: movieId }))) throw ApiError.notFound('Movie not found');
  if (!(await hasWatched(userId, movieId))) {
    throw ApiError.forbidden('You can review a movie after watching it with a ticket booked here');
  }

  const review = await Review.findOneAndUpdate(
    { movie: movieId, user: userId },
    { rating, comment },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).populate('user', 'name');
  await refreshSummary(movieId);
  return review;
}

/** Deletes the caller's review, if any. */
async function deleteReview(userId, movieId) {
  const removed = await Review.findOneAndDelete({ movie: movieId, user: userId });
  if (!removed) throw ApiError.notFound('You have not reviewed this movie');
  await refreshSummary(movieId);
}

/**
 * Paginated reviews plus a 1–5 star histogram for the movie page.
 * @param {string} movieId
 * @param {{ page: number, limit: number }} paging
 * @param {import('mongoose').Types.ObjectId} [userId] when given, includes the caller's review and eligibility
 */
async function listReviews(movieId, { page, limit }, userId) {
  const movieObjectId = new mongoose.Types.ObjectId(String(movieId));
  const [items, total, histogram, mine, canReview] = await Promise.all([
    Review.find({ movie: movieId })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Review.countDocuments({ movie: movieId }),
    Review.aggregate([{ $match: { movie: movieObjectId } }, { $group: { _id: '$rating', count: { $sum: 1 } } }]),
    userId ? Review.findOne({ movie: movieId, user: userId }) : null,
    userId ? hasWatched(userId, movieId) : false,
  ]);

  const stars = Object.fromEntries([1, 2, 3, 4, 5].map((n) => [n, 0]));
  histogram.forEach((h) => {
    stars[h._id] = h.count;
  });

  return { items, total, page, limit, histogram: stars, mine, canReview };
}

module.exports = { hasWatched, refreshSummary, upsertReview, deleteReview, listReviews };
