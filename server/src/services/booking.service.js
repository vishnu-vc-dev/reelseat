const Booking = require('../models/Booking');
const Show = require('../models/Show');
const SeatHold = require('../models/SeatHold');
const ApiError = require('../utils/ApiError');
const { priceSeats } = require('../utils/seats');
const { emitToShow } = require('../sockets');
const seatService = require('./seat.service');
const payments = require('./payment.service');
const { generateTicketCode } = require('./ticket.service');

/** Flat convenience fee charged per ticket, in rupees. */
const CONVENIENCE_FEE_PER_TICKET = 25;

/** Extra time granted on the hold once checkout opens, so slow UPI flows don't lose seats. */
const CHECKOUT_HOLD_MINUTES = 10;

/** Listeners notified after a booking is confirmed (email, analytics, ...). */
const confirmedListeners = [];

/** @param {(booking: import('mongoose').Document) => Promise<void>|void} fn */
function onBookingConfirmed(fn) {
  confirmedListeners.push(fn);
}

/**
 * Step 1 of checkout: validate the held seats, compute the price on the
 * server and open a gateway order. A PENDING booking is stored so the
 * payment can later be matched back to exactly these seats and this amount.
 *
 * @param {import('mongoose').Document & { _id: any, name: string, email: string }} user
 * @param {string} showId
 * @param {string[]} seatIds
 */
async function createOrder(user, showId, seatIds) {
  const show = await seatService.loadBookableShow(showId);
  const { seats, items, total } = priceSeats(show.seatLayout, seatIds);

  const sold = seats.filter((s) => show.bookedSeats.includes(s));
  if (sold.length) throw ApiError.conflict(`Already booked: ${sold.join(', ')}`, { seats: sold });
  await seatService.assertActiveHold(showId, user._id, seats);

  await SeatHold.updateMany(
    { show: showId, user: user._id, seat: { $in: seats } },
    { expiresAt: new Date(Date.now() + CHECKOUT_HOLD_MINUTES * 60 * 1000) },
  );

  const convenienceFee = CONVENIENCE_FEE_PER_TICKET * seats.length;
  const totalAmount = total + convenienceFee;

  const booking = new Booking({
    user: user._id,
    show: show._id,
    theatre: show.theatre._id,
    movie: show.movie,
    seats,
    items: items.map(({ seat, category, price }) => ({ seat, category, price })),
    ticketAmount: total,
    convenienceFee,
    totalAmount,
  });

  const order = await payments.createOrder({
    amountRupees: totalAmount,
    receipt: String(booking._id),
    notes: { bookingId: String(booking._id), showId: String(show._id) },
  });

  booking.payment = { provider: order.provider, orderId: order.id };
  await booking.save();

  return {
    bookingId: booking._id,
    amount: totalAmount,
    breakdown: { ticketAmount: total, convenienceFee, items },
    order: { id: order.id, amount: order.amount, currency: order.currency },
    keyId: payments.keyId,
    mock: order.provider === 'mock',
    prefill: { name: user.name, email: user.email },
  };
}

/**
 * Step 2: turn a verified payment into a confirmed booking.
 *
 * Idempotent and race-safe:
 *  1. An atomic PENDING → PROCESSING transition ensures only one caller (the
 *     browser callback or the webhook) does the work.
 *  2. Seats are claimed with a single conditional update that succeeds only
 *     if none of them are in `bookedSeats` yet — no double booking, even
 *     across multiple server instances.
 *  3. If the seats were lost in the meantime the payment is refunded.
 *
 * @param {{ orderId: string, paymentId: string }} input
 * @returns {Promise<import('mongoose').Document>}
 */
async function confirmBooking({ orderId, paymentId }) {
  const claimed = await Booking.findOneAndUpdate(
    { 'payment.orderId': orderId, status: 'PENDING' },
    { status: 'PROCESSING', 'payment.paymentId': paymentId },
    { new: true },
  );

  if (!claimed) {
    const existing = await Booking.findOne({ 'payment.orderId': orderId });
    if (!existing) throw ApiError.notFound('Booking not found for this order');
    return existing;
  }

  const reserved = await Show.updateOne(
    { _id: claimed.show, isCancelled: false, bookedSeats: { $nin: claimed.seats } },
    { $push: { bookedSeats: { $each: claimed.seats } } },
  );

  if (reserved.modifiedCount === 0) {
    claimed.failureReason = 'Seats were no longer available';
    try {
      claimed.payment.refundId = await payments.refund(paymentId, claimed.totalAmount);
      claimed.status = 'REFUNDED';
    } catch (err) {
      console.error(`Refund failed for booking ${claimed._id}:`, err.message);
      claimed.status = 'FAILED';
      claimed.failureReason += '; automatic refund failed, flagged for manual refund';
    }
    await claimed.save();
    return claimed;
  }

  claimed.status = 'CONFIRMED';
  claimed.confirmedAt = new Date();
  claimed.ticketCode = generateTicketCode();
  await claimed.save();

  await SeatHold.deleteMany({ show: claimed.show, seat: { $in: claimed.seats } });
  emitToShow(claimed.show, 'seats:booked', { seats: claimed.seats });

  /** Side effects must never fail the confirmation itself. */
  for (const listener of confirmedListeners) {
    Promise.resolve()
      .then(() => listener(claimed))
      .catch((err) => console.error('Booking confirmation listener failed:', err.message));
  }

  return claimed;
}

/**
 * Marks a pending booking as failed (Razorpay `payment.failed` webhook or the
 * customer closing checkout). Seat holds are left to expire naturally so the
 * customer can retry payment within the hold window.
 * @param {string} orderId
 * @param {string} [reason]
 */
async function failBooking(orderId, reason = 'Payment failed') {
  return Booking.findOneAndUpdate(
    { 'payment.orderId': orderId, status: 'PENDING' },
    { status: 'FAILED', failureReason: reason },
    { new: true },
  );
}

module.exports = {
  CONVENIENCE_FEE_PER_TICKET,
  createOrder,
  confirmBooking,
  failBooking,
  onBookingConfirmed,
};
