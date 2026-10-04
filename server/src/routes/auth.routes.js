const router = require('express').Router();

const ctrl = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const schemas = require('../validators/auth.validators');

router.post('/register', validate({ body: schemas.register }), ctrl.register);
router.post('/login', validate({ body: schemas.login }), ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', protect, ctrl.me);

module.exports = router;
