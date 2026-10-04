const mongoose = require('mongoose');

/**
 * Booking lifecycle:
 *
 *   PENDING ──(payment verified)──► PROCESSING ──► CONFIRMED
 *      │                                 │
 *      └──(payment failed)──► FAILED     └──(seats lost in a race)──► REFUNDED / FAILED
 *
 * PROCESSING is a short-lived claim that makes confirmation idempotent: the
 * client callback and the Razorpay webhook may both arrive, but only the one
 * that flips PENDING → PROCESSING continues.
 */
const BOOKING_STATUS = ['PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED', 'REFUNDED'];

const lineItemSchema = new mongoose.Schema(
  {
    seat: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { _id: false },
);

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true, index: true },
    /** Denormalised so partner revenue queries don't need to join through shows. */
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre', required: true, index: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true },
    seats: { type: [String], required: true },
    items: { type: [lineItemSchema], required: true },
    /** All amounts are in rupees. Razorpay receives paise (×100) at the edge. */
    ticketAmount: { type: Number, required: true },
    convenienceFee: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: BOOKING_STATUS, default: 'PENDING', index: true },
    payment: {
      provider: { type: String, enum: ['razorpay', 'mock'], required: true },
      orderId: { type: String, required: true, unique: true },
      paymentId: { type: String },
      refundId: { type: String },
    },
    ticketCode: { type: String, unique: true, sparse: true },
    confirmedAt: Date,
    checkedInAt: Date,
    emailSentAt: Date,
    failureReason: String,
  },
  { timestamps: true },
);

bookingSchema.index({ theatre: 1, status: 1, confirmedAt: -1 });

module.exports = mongoose.model('Booking', bookingSchema);
module.exports.BOOKING_STATUS = BOOKING_STATUS;
