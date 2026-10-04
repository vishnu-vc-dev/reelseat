const { z, email } = require('./common');

const theatreBody = z.object({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(60),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,15}$/, 'Invalid phone number'),
  email,
  screens: z.coerce.number().int().min(1).max(20).default(1),
});

const createTheatre = theatreBody;
const updateTheatre = theatreBody.partial();

const updateStatus = z.object({
  status: z.enum(['approved', 'blocked', 'pending']),
  reason: z.string().trim().max(300).optional(),
});

const adminList = z.object({
  status: z.enum(['pending', 'approved', 'blocked']).optional(),
});

module.exports = { createTheatre, updateTheatre, updateStatus, adminList };
