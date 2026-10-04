const router = require('express').Router();

const adminCtrl = require('../controllers/admin.controller');
const theatreCtrl = require('../controllers/theatre.controller');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { z, idParam } = require('../validators/common');
const theatreSchemas = require('../validators/theatre.validators');

/** Every route in this file is admin-only. */
router.use(protect, authorize('admin'));

router.get('/stats', adminCtrl.stats);
router.get(
  '/users',
  validate({
    query: z.object({
      role: z.enum(['user', 'partner', 'admin']).optional(),
      search: z.string().trim().max(100).optional(),
    }),
  }),
  adminCtrl.listUsers,
);
router.patch(
  '/users/:id/status',
  validate({ params: idParam, body: z.object({ isActive: z.boolean() }) }),
  adminCtrl.setUserActive,
);

router.get('/theatres', validate({ query: theatreSchemas.adminList }), theatreCtrl.adminListTheatres);
router.patch(
  '/theatres/:id/status',
  validate({ params: idParam, body: theatreSchemas.updateStatus }),
  theatreCtrl.updateTheatreStatus,
);

module.exports = router;
