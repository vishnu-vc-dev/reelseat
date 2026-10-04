const mongoose = require('mongoose');

/**
 * Temporary reservation of a single seat while a customer completes payment.
 *
 * - The unique (show, seat) index makes acquiring a hold atomic: if two users
 *   race for the same seat, MongoDB lets exactly one insert succeed.
 * - The TTL index lets MongoDB purge abandoned holds automatically. The TTL
 *   monitor only runs about once a minute, so queries also filter on
 *   `expiresAt > now` to be exact.
 */
const seatHoldSchema = new mongoose.Schema(
  {
    show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true },
    seat: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

seatHoldSchema.index({ show: 1, seat: 1 }, { unique: true });
seatHoldSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
seatHoldSchema.index({ user: 1, show: 1 });

module.exports = mongoose.model('SeatHold', seatHoldSchema);
