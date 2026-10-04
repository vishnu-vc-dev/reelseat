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

module.exports = { register, login };
