const router = require('express').Router();

const ctrl = require('../controllers/partner.controller');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { z, objectId } = require('../validators/common');

router.use(protect, authorize('partner', 'admin'));

router.get('/stats', ctrl.stats);
router.get('/bookings', validate({ query: z.object({ show: objectId.optional() }) }), ctrl.bookings);
router.post('/checkin', validate({ body: z.object({ code: z.string().trim().min(4).max(200) }) }), ctrl.checkIn);

module.exports = router;
