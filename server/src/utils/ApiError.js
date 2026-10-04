/**
 * Operational error carrying an HTTP status code.
 * Throw it from controllers/services; the global error handler turns it into
 * a consistent `{ success: false, message, details? }` JSON response.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status to respond with
   * @param {string} message    Human readable message, safe to show to clients
   * @param {unknown} [details] Optional structured payload (e.g. validation errors)
   */
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message = 'Bad request', details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Please log in to continue') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict', details) {
    return new ApiError(409, message, details);
  }
}

module.exports = ApiError;
