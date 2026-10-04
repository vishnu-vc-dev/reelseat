const router = require('express').Router();

const ctrl = require('../controllers/show.controller');
const seatCtrl = require('../controllers/seat.controller');
const validate = require('../middleware/validate');
const { protect, optionalAuth, authorize } = require('../middleware/auth');
const { z, idParam } = require('../validators/common');
const schemas = require('../validators/show.validators');

const partnerOnly = [protect, authorize('partner', 'admin')];

const holdBody = z.object({
  seats: z
    .array(
      z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{1,2}\d{1,2}$/, 'Invalid seat id'),
    )
    .min(1, 'Select at least one seat')
    .max(10),
});

/** Partner routes are declared before `/:id` so "mine" is not parsed as an id. */
router.get('/mine', partnerOnly, validate({ query: schemas.mineQuery }), ctrl.myShows);
router.post('/', partnerOnly, validate({ body: schemas.createShow }), ctrl.createShow);
router.patch('/:id', partnerOnly, validate({ params: idParam, body: schemas.updateShow }), ctrl.updateShow);
router.delete('/:id', partnerOnly, validate({ params: idParam }), ctrl.deleteShow);

/** Public */
router.get(
  '/movie/:movieId',
  validate({ params: schemas.byMovieParams, query: schemas.byMovieQuery }),
  ctrl.showsForMovie,
);
router.get('/:id', validate({ params: idParam }), ctrl.getShow);

/** Seat availability (public) and temporary holds (any logged-in customer). */
router.get('/:id/seats', optionalAuth, validate({ params: idParam }), seatCtrl.availability);
router.post('/:id/hold', protect, validate({ params: idParam, body: holdBody }), seatCtrl.hold);
router.delete('/:id/hold', protect, validate({ params: idParam }), seatCtrl.release);

module.exports = router;
