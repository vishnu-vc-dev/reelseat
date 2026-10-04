const mongoose = require('mongoose');

const THEATRE_STATUS = ['pending', 'approved', 'blocked'];

/**
 * A cinema owned by a partner.
 * New theatres start as `pending` and only become bookable once an admin
 * approves them. Admins can later block a theatre, which hides its shows.
 */
const theatreSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    screens: { type: Number, default: 1, min: 1, max: 20 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: THEATRE_STATUS, default: 'pending', index: true },
    /** Shown to the partner when an admin blocks the theatre. */
    statusReason: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true },
);

theatreSchema.index({ city: 1, status: 1 });

module.exports = mongoose.model('Theatre', theatreSchema);
module.exports.THEATRE_STATUS = THEATRE_STATUS;
