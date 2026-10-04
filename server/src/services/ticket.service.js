const crypto = require('crypto');
const QRCode = require('qrcode');
const env = require('../config/env');

/**
 * Human friendly ticket reference printed on the ticket, e.g. "RS-7F3A9C21".
 * Uses crypto randomness so codes cannot be guessed sequentially.
 */
function generateTicketCode() {
  return `RS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * Builds the tamper-proof payload encoded in the QR code:
 * `<bookingId>.<hmac>`. Gate staff scan it and the server re-computes the
 * HMAC, so a forged or edited QR code is rejected without a database lookup.
 * @param {string} bookingId
 */
function signTicket(bookingId) {
  const mac = crypto.createHmac('sha256', env.ticketSecret).update(String(bookingId)).digest('hex').slice(0, 24);
  return `${bookingId}.${mac}`;
}

/**
 * @param {string} token value scanned from a QR code
 * @returns {string|null} booking id when the signature is valid
 */
function verifyTicket(token) {
  const [bookingId, mac] = String(token || '').trim().split('.');
  if (!bookingId || !mac || !/^[a-f\d]{24}$/i.test(bookingId)) return null;
  const expected = signTicket(bookingId).split('.')[1];
  const ok = expected.length === mac.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(mac));
  return ok ? bookingId : null;
}

/**
 * Renders the ticket QR code as a PNG data URL (used in the app and in email).
 * @param {string} bookingId
 */
function ticketQrDataUrl(bookingId) {
  return QRCode.toDataURL(signTicket(bookingId), { margin: 1, width: 280, errorCorrectionLevel: 'M' });
}

module.exports = { generateTicketCode, signTicket, verifyTicket, ticketQrDataUrl };
