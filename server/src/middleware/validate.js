const ApiError = require('../utils/ApiError');

/**
 * Validates `req.body`, `req.query` and `req.params` against zod schemas.
 * On success the parsed (coerced + stripped) values replace the raw input, so
 * controllers only ever see whitelisted fields.
 *
 * @param {{ body?: import('zod').ZodType, query?: import('zod').ZodType, params?: import('zod').ZodType }} schemas
 * @returns {import('express').RequestHandler}
 */
const validate = (schemas) => (req, res, next) => {
  const issues = [];

  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key] ?? {});
    if (!result.success) {
      issues.push(
        ...result.error.issues.map((issue) => ({
          field: [key, ...issue.path].join('.'),
          message: issue.message,
        })),
      );
    } else if (key === 'query') {
      /** Express 4 exposes req.query via a getter on some setups, so redefine instead of assigning. */
      Object.defineProperty(req, 'query', { value: result.data, writable: true });
    } else {
      req[key] = result.data;
    }
  }

  if (issues.length) return next(ApiError.badRequest('Validation failed', issues));
  return next();
};

module.exports = validate;
