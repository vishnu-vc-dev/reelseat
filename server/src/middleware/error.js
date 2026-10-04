const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

/**
 * Catch-all for unmatched routes. Registered after every router.
 */
function notFound(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

/**
 * Global error handler.
 * Normalises Mongoose / body-parser errors into proper HTTP status codes and
 * hides internal error messages in production so stack details never leak.
 */
/* eslint-disable-next-line no-unused-vars */
function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details;

  if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.code === 11000) {
    /** Duplicate key from a unique index, e.g. an email that is already registered. */
    status = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = field ? `${field} already exists` : 'Duplicate value';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Request body too large';
  }

  if (status >= 500) {
    console.error(err);
    if (env.isProd) message = 'Internal server error';
  }

  res.status(status).json({ success: false, message, ...(details && { details }) });
}

module.exports = { notFound, errorHandler };
