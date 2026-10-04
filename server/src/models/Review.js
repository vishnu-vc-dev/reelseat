const mongoose = require('mongoose');

/**
 * A customer's rating (1–5) and optional comment for a movie.
 * One review per customer per movie; posting again edits the existing one.
 */
const reviewSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

reviewSchema.index({ movie: 1, user: 1 }, { unique: true });
reviewSchema.index({ movie: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
