const { z, email } = require('./common');

const theatreFields = {
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(60),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,15}$/, 'Invalid phone number'),
  email,
  screens: z.coerce.number().int().min(1).max(20),
};

const createTheatre = z.object({ ...theatreFields, screens: theatreFields.screens.default(1) });

/** No defaults here: zod would otherwise reset `screens` on every partial update. */
const updateTheatre = z.object(theatreFields).partial();

const updateStatus = z.object({
  status: z.enum(['approved', 'blocked', 'pending']),
  reason: z.string().trim().max(300).optional(),
});

const adminList = z.object({
  status: z.enum(['pending', 'approved', 'blocked']).optional(),
});

module.exports = { createTheatre, updateTheatre, updateStatus, adminList };
