const { z } = require('zod');

/** 24-char hex MongoDB ObjectId. Rejecting bad ids early avoids CastErrors deeper in the stack. */
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const idParam = z.object({ id: objectId });

const email = z.string().trim().toLowerCase().pipe(z.email('Invalid email'));

/** At least 8 chars with one letter and one digit — enforced on register and reset. */
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

module.exports = { z, objectId, idParam, email, password };
