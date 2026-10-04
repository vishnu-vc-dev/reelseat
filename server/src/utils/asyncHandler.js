/**
 * Wraps an async Express handler so that rejected promises are forwarded to
 * the error middleware instead of becoming unhandled rejections.
 *
 * @param {(req: import('express').Request, res: import('express').Response, next: Function) => Promise<any>} fn
 * @returns {import('express').RequestHandler}
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
