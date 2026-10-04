const asyncHandler = require('../utils/asyncHandler');
const reviews = require('../services/review.service');

/** GET /api/movies/:id/reviews — public; logged-in callers also get their own review and eligibility. */
const list = asyncHandler(async (req, res) => {
  const data = await reviews.listReviews(req.params.id, req.query, req.user?._id);
  res.json({ success: true, data });
});

/** PUT /api/movies/:id/reviews — create or update the caller's review. */
const upsert = asyncHandler(async (req, res) => {
  const review = await reviews.upsertReview(req.user._id, req.params.id, req.body);
  res.json({ success: true, message: 'Thanks for your review!', data: review });
});

/** DELETE /api/movies/:id/reviews — remove the caller's review. */
const remove = asyncHandler(async (req, res) => {
  await reviews.deleteReview(req.user._id, req.params.id);
  res.json({ success: true, message: 'Review deleted' });
});

module.exports = { list, upsert, remove };
