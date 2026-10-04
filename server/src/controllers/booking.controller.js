const Booking = require('../models/Booking');
const Theatre = require('../models/Theatre');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ticketQrDataUrl } = require('../services/ticket.service');

const populateTicket = [
  { path: 'movie', select: 'title posterUrl durationMinutes certificate' },
  { path: 'theatre', select: 'name address city' },
  { path: 'show', select: 'startTime screen language format' },
];

/** GET /api/bookings/me — the caller's bookings, newest first. Abandoned checkouts are hidden. */
const myBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id, status: { $in: ['CONFIRMED', 'REFUNDED'] } })
    .populate(populateTicket)
    .sort({ createdAt: -1 });
  res.json({ success: true, data: bookings });
});

/**
 * GET /api/bookings/:id — a single ticket with its QR code.
 * Visible to the customer, the theatre's partner and admins.
 */
const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate(populateTicket);
  if (!booking) throw ApiError.notFound('Booking not found');

  const isOwner = String(booking.user) === String(req.user._id);
  let allowed = isOwner || req.user.role === 'admin';
  if (!allowed && req.user.role === 'partner') {
    allowed = Boolean(await Theatre.exists({ _id: booking.theatre._id, owner: req.user._id }));
  }
  if (!allowed) throw ApiError.notFound('Booking not found');

  const data = booking.toObject();
  if (booking.status === 'CONFIRMED') data.qrCode = await ticketQrDataUrl(booking._id);
  res.json({ success: true, data });
});

module.exports = { myBookings, getBooking };
