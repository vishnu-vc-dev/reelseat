const router = require('express').Router();

const ctrl = require('../controllers/booking.controller');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { idParam } = require('../validators/common');

router.use(protect);
router.get('/me', ctrl.myBookings);
router.get('/:id', validate({ params: idParam }), ctrl.getBooking);
router.post('/:id/cancel', validate({ params: idParam }), ctrl.cancelBooking);

module.exports = router;
