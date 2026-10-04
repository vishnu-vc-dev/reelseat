/**
 * Minimal, inline-styled HTML email templates.
 * Email clients ignore <style> blocks and external CSS, so every style is inline
 * and the layout is a single table-free column that renders well on mobile.
 */

const BRAND = '#f84464';

/** Escapes user-controlled values (names, titles) before interpolating into HTML. */
function esc(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

function layout(title, body) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f6;font-family:Arial,Helvetica,sans-serif;color:#222">
  <div style="max-width:520px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e6e6ea">
    <div style="background:#1f2533;color:#fff;padding:16px 24px;font-size:20px;font-weight:bold">
      book<span style="color:${BRAND}">my</span>show
    </div>
    <div style="padding:24px">
      <h2 style="margin:0 0 16px;font-size:20px">${esc(title)}</h2>
      ${body}
    </div>
    <div style="padding:12px 24px;background:#fafafa;color:#888;font-size:12px">
      This is an automated message. Please do not reply.
    </div>
  </div></body></html>`;
}

/**
 * @param {{ name: string, otp: string, minutes: number }} data
 */
function passwordResetOtp({ name, otp, minutes }) {
  const html = layout(
    'Reset your password',
    `<p>Hi ${esc(name)},</p>
     <p>Use this code to reset your password. It expires in ${minutes} minutes.</p>
     <p style="font-size:32px;letter-spacing:8px;font-weight:bold;text-align:center;margin:24px 0">${esc(otp)}</p>
     <p style="color:#666;font-size:13px">If you did not request this, you can safely ignore this email; your password will not change.</p>`,
  );
  const text = `Hi ${name}, your password reset code is ${otp}. It expires in ${minutes} minutes.`;
  return { subject: `${otp} is your password reset code`, html, text };
}

/**
 * @param {{
 *   name: string, movie: string, theatre: string, address: string, startTime: Date,
 *   screen: number, seats: string[], ticketCode: string, total: number, format: string, language: string
 * }} data
 */
function bookingConfirmation(data) {
  const when = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(data.startTime);

  const row = (label, value) =>
    `<tr><td style="padding:6px 0;color:#666;width:110px">${label}</td><td style="padding:6px 0;font-weight:bold">${esc(value)}</td></tr>`;

  const html = layout(
    'Your booking is confirmed! 🎬',
    `<p>Hi ${esc(data.name)}, enjoy the show. Your ticket QR code is attached — show it at the entrance.</p>
     <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
       ${row('Movie', `${data.movie} (${data.language}, ${data.format})`)}
       ${row('When', when)}
       ${row('Where', `${data.theatre}, Screen ${data.screen}`)}
       ${row('Address', data.address)}
       ${row('Seats', data.seats.join(', '))}
       ${row('Amount paid', `₹${data.total}`)}
     </table>
     <div style="text-align:center;margin:20px 0;padding:12px;border:2px dashed ${BRAND};border-radius:8px">
       <div style="color:#666;font-size:12px">BOOKING ID</div>
       <div style="font-size:22px;font-weight:bold;letter-spacing:2px">${esc(data.ticketCode)}</div>
     </div>`,
  );
  const text = `Booking ${data.ticketCode} confirmed: ${data.movie} at ${data.theatre}, ${when}. Seats ${data.seats.join(', ')}.`;
  return { subject: `Booking confirmed: ${data.movie} — ${data.ticketCode}`, html, text };
}

module.exports = { passwordResetOtp, bookingConfirmation, esc };
