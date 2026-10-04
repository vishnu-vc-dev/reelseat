const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

/** Cost factor for bcrypt. 12 rounds keeps hashing around ~250ms on commodity hardware. */
const SALT_ROUNDS = 12;

const ROLES = ['user', 'partner', 'admin'];

/**
 * Application user.
 * `role` drives authorization:
 *  - user    → browse and book tickets
 *  - partner → owns theatres and schedules shows (after admin approval)
 *  - admin   → manages the movie catalogue and approves theatres
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: 'user' },
    isActive: { type: Boolean, default: true },

    /**
     * Password reset state. Only a SHA-256 hash of the OTP is stored so a
     * database leak does not expose usable reset codes.
     */
    resetOtpHash: { type: String, select: false },
    resetOtpExpiresAt: { type: Date, select: false },
    resetOtpAttempts: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);

/**
 * Hash the password whenever it is set or changed.
 * Using a pre-save hook guarantees no code path can persist a plain-text password.
 */
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

/**
 * Constant-time comparison of a candidate password with the stored hash.
 * @param {string} candidate
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

/** Strip secrets whenever a user document is serialised into a response. */
userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    delete ret.resetOtpHash;
    delete ret.resetOtpExpiresAt;
    delete ret.resetOtpAttempts;
    delete ret.__v;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
