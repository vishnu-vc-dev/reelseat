const Booking = require('../models/Booking');
const { sendEmail } = require('./email.service');
const { onBookingConfirmed } = require('./booking.service');
const { ticketQrDataUrl } = require('./ticket.service');
const templates = require('../utils/emailTemplates');

/**
 * Emails the e-ticket (with the QR code as a PNG attachment) once a booking
 * is confirmed. Runs outside the request cycle: a slow or failing email
 * provider never delays or breaks the booking itself.
 * @param {import('mongoose').Document & { _id: any }} confirmed
 */
async function sendTicketEmail(confirmed) {
  const booking = await Booking.findById(confirmed._id).populate([
    { path: 'user', select: 'name email' },
    { path: 'movie', select: 'title' },
    { path: 'theatre', select: 'name address' },
    { path: 'show', select: 'startTime screen format language' },
  ]);
  if (!booking || booking.emailSentAt) return;

  const qr = await ticketQrDataUrl(booking._id);
  const { subject, html, text } = templates.bookingConfirmation({
    name: booking.user.name,
    movie: booking.movie.title,
    theatre: booking.theatre.name,
    address: booking.theatre.address,
    startTime: booking.show.startTime,
    screen: booking.show.screen,
    format: booking.show.format,
    language: booking.show.language,
    seats: booking.seats,
    ticketCode: booking.ticketCode,
    total: booking.totalAmount,
  });

  await sendEmail({
    to: booking.user.email,
    toName: booking.user.name,
    subject,
    html,
    text,
    attachments: [{ name: `${booking.ticketCode}.png`, content: qr.split(',')[1] }],
  });

  await Booking.updateOne({ _id: booking._id }, { emailSentAt: new Date() });
}

onBookingConfirmed(sendTicketEmail);

module.exports = { sendTicketEmail };
