const Booking = require('../models/Booking');
const Show = require('../models/Show');
const ApiError = require('../utils/ApiError');
const payments = require('./payment.service');
const { emitToShow } = require('../sockets');

const HOUR_MS = 60 * 60 * 1000;

/**
 * Cancellation policy, modelled on common Indian cinema chains:
 *  - more than 24 hours before the show → 100% of the ticket amount
 *  - between 2 and 24 hours before      → 75% of the ticket amount
 *  - less than 2 hours before           → no cancellation
 * The convenience fee is never refunded. Admitted tickets cannot be cancelled.
 */
const POLICY = [
  { minHoursBefore: 24, refundRatio: 1 },
  { minHoursBefore: 2, refundRatio: 0.75 },
];
const CUTOFF_HOURS = 2;

/**
 * Works out whether a booking can be cancelled right now and for how much.
 * @param {{ status: string, checkedInAt?: Date, ticketAmount: number }} booking
 * @param {Date} showStart
 * @param {Date} [now]
 */
function quote(booking, showStart, now = new Date()) {
  const hoursLeft = (new Date(showStart).getTime() - now.getTime()) / HOUR_MS;
  const deadline = new Date(new Date(showStart).getTime() - CUTOFF_HOURS * HOUR_MS);

  if (booking.status !== 'CONFIRMED') return { allowed: false, reason: 'Only confirmed bookings can be cancelled', deadline };
  if (booking.checkedInAt) return { allowed: false, reason: 'Ticket has already been used', deadline };

  const tier = POLICY.find((p) => hoursLeft >= p.minHoursBefore);
  if (!tier) return { allowed: false, reason: `Cancellation closes ${CUTOFF_HOURS} hours before the show`, deadline };

  const refundAmount = Math.round(booking.ticketAmount * tier.refundRatio);
  return { allowed: true, refundAmount, refundPercent: tier.refundRatio * 100, deadline };
}

/**
 * Cancels a customer's booking, frees the seats and refunds the payment.
 *
 * The status flip CONFIRMED → CANCELLED is atomic, so a double click or two
 * tabs cannot trigger two refunds. Seats are released before the refund call
 * so a slow gateway never keeps seats locked.
 *
 * @param {import('mongoose').Types.ObjectId} userId
 * @param {string} bookingId
 */
async function cancelBooking(userId, bookingId) {
  const booking = await Booking.findOne({ _id: bookingId, user: userId }).populate('show', 'startTime');
  if (!booking) throw ApiError.notFound('Booking not found');

  const terms = quote(booking, booking.show.startTime);
  if (!terms.allowed) throw ApiError.badRequest(terms.reason);

  const cancelled = await Booking.findOneAndUpdate(
    { _id: booking._id, status: 'CONFIRMED', checkedInAt: null },
    { status: 'CANCELLED', cancelledAt: new Date(), refundAmount: terms.refundAmount },
    { new: true },
  );
  if (!cancelled) throw ApiError.conflict('Booking was already cancelled or used');

  await Show.updateOne({ _id: booking.show._id }, { $pullAll: { bookedSeats: booking.seats } });
  emitToShow(booking.show._id, 'seats:released', { seats: booking.seats });

  if (terms.refundAmount > 0) {
    try {
      cancelled.payment.refundId = await payments.refund(cancelled.payment.paymentId, terms.refundAmount);
    } catch (err) {
      /** The seats are already free; a failed refund is flagged for manual follow-up rather than undone. */
      console.error(`Refund failed for cancelled booking ${cancelled._id}:`, err.message);
      cancelled.failureReason = 'Automatic refund failed; flagged for manual refund';
    }
    await cancelled.save();
  }

  return cancelled;
}

module.exports = { quote, cancelBooking, CUTOFF_HOURS, POLICY };
