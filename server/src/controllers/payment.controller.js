const Booking = require('../models/Booking');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const bookingService = require('../services/booking.service');
const payments = require('../services/payment.service');

/** POST /api/payments/order — opens checkout for the caller's held seats. */
const createOrder = asyncHandler(async (req, res) => {
  const data = await bookingService.createOrder(req.user, req.body.showId, req.body.seats);
  res.status(201).json({ success: true, data });
});

/**
 * POST /api/payments/verify — called by the browser after Razorpay Checkout
 * succeeds. The signature is verified server-side before anything is booked.
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, paymentId, signature } = req.body;

  const booking = await Booking.findOne({ 'payment.orderId': orderId }).select('user');
  if (!booking || String(booking.user) !== String(req.user._id)) throw ApiError.notFound('Order not found');

  if (!payments.verifyPaymentSignature({ orderId, paymentId, signature })) {
    await bookingService.failBooking(orderId, 'Invalid payment signature');
    throw ApiError.badRequest('Payment verification failed');
  }

  const confirmed = await bookingService.confirmBooking({ orderId, paymentId });
  if (confirmed.status !== 'CONFIRMED') {
    throw ApiError.conflict(
      confirmed.status === 'REFUNDED'
        ? 'Sorry, these seats were just taken. Your payment has been refunded.'
        : confirmed.failureReason || 'Booking could not be completed',
      { bookingId: confirmed._id, status: confirmed.status },
    );
  }

  res.json({ success: true, message: 'Booking confirmed', data: confirmed });
});

/** POST /api/payments/cancel — customer dismissed the checkout popup. */
const cancelPayment = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ 'payment.orderId': req.body.orderId, user: req.user._id });
  if (!booking) throw ApiError.notFound('Order not found');
  await bookingService.failBooking(req.body.orderId, 'Checkout cancelled by customer');
  res.json({ success: true, message: 'Payment cancelled' });
});

/**
 * POST /api/payments/webhook — server-to-server notification from Razorpay.
 *
 * This is the safety net for when the browser never calls /verify (closed
 * tab, network drop after paying). It receives the raw body because the
 * signature must be computed over the exact bytes Razorpay sent. It always
 * answers 200 for authentic events so Razorpay does not retry needlessly;
 * confirmBooking is idempotent anyway.
 */
const webhook = async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  if (!payments.verifyWebhookSignature(req.body, signature)) {
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }

  try {
    const payment = event.payload?.payment?.entity;
    if ((event.event === 'payment.captured' || event.event === 'order.paid') && payment?.order_id) {
      await bookingService.confirmBooking({ orderId: payment.order_id, paymentId: payment.id });
    } else if (event.event === 'payment.failed' && payment?.order_id) {
      await bookingService.failBooking(payment.order_id, payment.error_description || 'Payment failed');
    }
  } catch (err) {
    /** Unknown orders (e.g. test pings) are acknowledged; real failures are logged for follow-up. */
    if (err.statusCode !== 404) console.error('Webhook processing failed:', err);
  }

  return res.json({ success: true });
};

/** GET /api/payments/config — tells the client whether to load real Razorpay Checkout. */
const config = (req, res) => {
  res.json({ success: true, data: { mock: payments.isMock, keyId: payments.keyId || null } });
};

module.exports = { createOrder, verifyPayment, cancelPayment, webhook, config };
