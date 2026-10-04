const router = require('express').Router();

const ctrl = require('../controllers/theatre.controller');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const { idParam } = require('../validators/common');
const schemas = require('../validators/theatre.validators');

router.get('/cities', ctrl.listCities);

/** Partner self-service. Admins can also act on any theatre through these routes. */
router.use(protect, authorize('partner', 'admin'));
router.get('/mine', ctrl.myTheatres);
router.post('/', validate({ body: schemas.createTheatre }), ctrl.createTheatre);
router.patch('/:id', validate({ params: idParam, body: schemas.updateTheatre }), ctrl.updateTheatre);
router.delete('/:id', validate({ params: idParam }), ctrl.deleteTheatre);

module.exports = router;
