const router = require('express').Router();

/**
 * Root API router. Every feature module mounts its own router here so that
 * app.js stays focused on cross-cutting middleware.
 */
router.use('/auth', require('./auth.routes'));
router.use('/movies', require('./movie.routes'));
router.use('/theatres', require('./theatre.routes'));
router.use('/shows', require('./show.routes'));
router.use('/payments', require('./payment.routes'));
router.use('/bookings', require('./booking.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
