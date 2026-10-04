const crypto = require('crypto');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { sendEmail } = require('./email.service');
const templates = require('../utils/emailTemplates');

const OTP_TTL_MINUTES = 10;
/** After this many wrong guesses the code is burned; a 6-digit code can't be brute forced in 5 tries. */
const MAX_ATTEMPTS = 5;

/** SHA-256 is fine here (unlike for passwords) because the OTP is short-lived and attempt-limited. */
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

/**
 * Issues a 6-digit OTP and emails it.
 * Silently does nothing for unknown emails so the endpoint cannot be used
 * to discover which addresses have accounts.
 * @param {string} email
 */
async function requestReset(email) {
  const user = await User.findOne({ email, isActive: true });
  if (!user) return;

  const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  user.resetOtpHash = hashOtp(otp);
  user.resetOtpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  user.resetOtpAttempts = 0;
  await user.save({ validateBeforeSave: false });

  const { subject, html, text } = templates.passwordResetOtp({ name: user.name, otp, minutes: OTP_TTL_MINUTES });
  await sendEmail({ to: user.email, toName: user.name, subject, html, text });
}

/**
 * Verifies the OTP and sets the new password.
 * @param {{ email: string, otp: string, password: string }} input
 */
async function resetPassword({ email, otp, password }) {
  const invalid = ApiError.badRequest('Invalid or expired code');
  const user = await User.findOne({ email }).select('+resetOtpHash +resetOtpExpiresAt +resetOtpAttempts');
  if (!user || !user.resetOtpHash || user.resetOtpExpiresAt < new Date()) throw invalid;

  if (user.resetOtpAttempts >= MAX_ATTEMPTS) {
    user.resetOtpHash = undefined;
    await user.save({ validateBeforeSave: false });
    throw ApiError.badRequest('Too many attempts. Please request a new code.');
  }

  const matches = crypto.timingSafeEqual(Buffer.from(hashOtp(otp)), Buffer.from(user.resetOtpHash));
  if (!matches) {
    user.resetOtpAttempts += 1;
    await user.save({ validateBeforeSave: false });
    throw invalid;
  }

  user.password = password;
  user.resetOtpHash = undefined;
  user.resetOtpExpiresAt = undefined;
  user.resetOtpAttempts = 0;
  await user.save();
}

module.exports = { requestReset, resetPassword, OTP_TTL_MINUTES, MAX_ATTEMPTS };
