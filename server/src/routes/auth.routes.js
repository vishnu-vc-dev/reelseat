const router = require('express').Router();

const ctrl = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const schemas = require('../validators/auth.validators');

router.post('/register', validate({ body: schemas.register }), ctrl.register);
router.post('/login', validate({ body: schemas.login }), ctrl.login);
router.post('/logout', ctrl.logout);
router.post('/forgot-password', validate({ body: schemas.forgotPassword }), ctrl.forgotPassword);
router.post('/reset-password', validate({ body: schemas.resetPassword }), ctrl.resetPassword);

router.get('/me', protect, ctrl.me);
router.patch('/me', protect, validate({ body: schemas.updateProfile }), ctrl.updateProfile);
router.patch('/password', protect, validate({ body: schemas.changePassword }), ctrl.changePassword);

module.exports = router;
