const router = require('express').Router();

const ctrl = require('../controllers/movie.controller');
const reviewCtrl = require('../controllers/review.controller');
const validate = require('../middleware/validate');
const { protect, optionalAuth, authorize } = require('../middleware/auth');
const { z, idParam } = require('../validators/common');
const schemas = require('../validators/movie.validators');

/** Public catalogue */
router.get('/', optionalAuth, validate({ query: schemas.listMovies }), ctrl.listMovies);
router.get('/filters', ctrl.getFilters);
router.get('/:id', optionalAuth, validate({ params: idParam }), ctrl.getMovie);

/** Reviews: anyone can read; customers who watched the movie can write. */
const reviewQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
const reviewBody = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});
router.get('/:id/reviews', optionalAuth, validate({ params: idParam, query: reviewQuery }), reviewCtrl.list);
router.put('/:id/reviews', protect, validate({ params: idParam, body: reviewBody }), reviewCtrl.upsert);
router.delete('/:id/reviews', protect, validate({ params: idParam }), reviewCtrl.remove);

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
