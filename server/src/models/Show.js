const mongoose = require('mongoose');

const FORMATS = ['2D', '3D', 'IMAX', '4DX'];

/**
 * A pricing tier inside the auditorium, e.g. Recliner rows A-B at ₹450.
 * Row labels are unique across categories so a seat id like "C7" maps to
 * exactly one tier.
 */
const seatCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    rows: { type: [String], required: true },
  },
  { _id: false },
);

/**
 * One screening of a movie in a theatre screen at a given time.
 *
 * `bookedSeats` is the source of truth for sold seats. It is only ever
 * modified with a conditional atomic update (see booking service), which is
 * what prevents two customers from buying the same seat.
 */
const showSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre', required: true },
    screen: { type: Number, default: 1, min: 1 },
    startTime: { type: Date, required: true },
    /** Derived from movie duration plus a cleaning buffer; used for overlap checks. */
    endTime: { type: Date, required: true },
    language: { type: String, required: true, trim: true },
    format: { type: String, enum: FORMATS, default: '2D' },
    seatLayout: {
      seatsPerRow: { type: Number, required: true, min: 1, max: 40 },
      categories: { type: [seatCategorySchema], required: true },
    },
    bookedSeats: { type: [String], default: [] },
    isCancelled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

showSchema.index({ movie: 1, startTime: 1 });
showSchema.index({ theatre: 1, screen: 1, startTime: 1 });

/** Total sellable seats in this show's layout. */
showSchema.virtual('totalSeats').get(function totalSeats() {
  const rows = this.seatLayout.categories.reduce((n, c) => n + c.rows.length, 0);
  return rows * this.seatLayout.seatsPerRow;
});

showSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Show', showSchema);
module.exports.FORMATS = FORMATS;
