const mongoose = require('mongoose');

const CERTIFICATES = ['U', 'UA', 'A'];

/**
 * A film in the catalogue. Only admins create or edit movies; partners pick
 * from this list when scheduling shows.
 */
const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    durationMinutes: { type: Number, required: true, min: 1, max: 600 },
    genres: { type: [String], default: [] },
    languages: { type: [String], default: [] },
    releaseDate: { type: Date, required: true },
    certificate: { type: String, enum: CERTIFICATES, default: 'UA' },
    posterUrl: { type: String, required: true, trim: true },
    trailerUrl: { type: String, trim: true },
    director: { type: String, trim: true },
    cast: { type: [String], default: [] },
    /** Inactive movies are hidden from customers but kept for booking history. */
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

/** Weighted text index powering the search box (title matters more than description). */
movieSchema.index({ title: 'text', description: 'text' }, { weights: { title: 5, description: 1 } });
movieSchema.index({ releaseDate: -1 });

module.exports = mongoose.model('Movie', movieSchema);
module.exports.CERTIFICATES = CERTIFICATES;
