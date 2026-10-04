const router = require('express').Router();

const ctrl = require('../controllers/show.controller');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { idParam } = require('../validators/common');
const schemas = require('../validators/show.validators');

const partnerOnly = [protect, authorize('partner', 'admin')];

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

module.exports = router;
