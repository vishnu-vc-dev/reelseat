const router = require('express').Router();

/**
 * Root API router. Every feature module mounts its own router here so that
 * app.js stays focused on cross-cutting middleware.
 */
router.use('/auth', require('./auth.routes'));

module.exports = router;
