const { z, email, password } = require('./common');

const register = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(60),
  email,
  password,
  /**
   * Public sign-up can only create customers or partners.
   * Admin accounts are provisioned through the seed script, never via the API.
   */
  role: z.enum(['user', 'partner']).default('user'),
});

const login = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

const forgotPassword = z.object({ email });

const resetPassword = z.object({
  email,
  otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6 digit code'),
  password,
});

const changePassword = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
});

const updateProfile = z.object({
  name: z.string().trim().min(2).max(60),
});

module.exports = { register, login, forgotPassword, resetPassword, changePassword, updateProfile };
