const router = require('express').Router();

const ctrl = require('../controllers/movie.controller');
const validate = require('../middleware/validate');
const { protect, optionalAuth, authorize } = require('../middleware/auth');
const { idParam } = require('../validators/common');
const schemas = require('../validators/movie.validators');

/** Public catalogue */
router.get('/', optionalAuth, validate({ query: schemas.listMovies }), ctrl.listMovies);
router.get('/filters', ctrl.getFilters);
router.get('/:id', optionalAuth, validate({ params: idParam }), ctrl.getMovie);

/** Admin-only catalogue management */
router.post('/', protect, authorize('admin'), validate({ body: schemas.createMovie }), ctrl.createMovie);
router.patch(
  '/:id',
  protect,
  authorize('admin'),
  validate({ params: idParam, body: schemas.updateMovie }),
  ctrl.updateMovie,
);
router.delete('/:id', protect, authorize('admin'), validate({ params: idParam }), ctrl.deleteMovie);

module.exports = router;
