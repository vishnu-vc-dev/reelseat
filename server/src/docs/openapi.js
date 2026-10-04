/**
 * OpenAPI 3 description of the REST API, served with Swagger UI at /api/docs.
 * Kept hand-written (rather than generated from comments) so the contract is
 * reviewed deliberately whenever an endpoint changes.
 */

const id = { name: 'id', in: 'path', required: true, schema: { type: 'string', example: '6650c1f2a1b2c3d4e5f60718' } };
const json = (schema) => ({ 'application/json': { schema } });
const ok = (description, schema = { $ref: '#/components/schemas/Envelope' }) => ({ description, content: json(schema) });
const errors = {
  400: { $ref: '#/components/responses/BadRequest' },
  401: { $ref: '#/components/responses/Unauthorized' },
  403: { $ref: '#/components/responses/Forbidden' },
  404: { $ref: '#/components/responses/NotFound' },
};
const secured = [{ cookieAuth: [] }, { bearerAuth: [] }];

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'BookMyShow API',
    version: '1.0.0',
    description:
      'REST API for the BookMyShow movie ticket booking platform. Authentication uses an httpOnly `token` cookie ' +
      'set by `/auth/login` (a `Bearer` token is also accepted). All responses use the envelope ' +
      '`{ success, message?, data?, meta?, details? }`.',
  },
  servers: [{ url: '/api' }],
  tags: [
    { name: 'Auth' },
    { name: 'Movies' },
    { name: 'Reviews' },
    { name: 'Theatres' },
    { name: 'Shows' },
    { name: 'Seats' },
    { name: 'Payments' },
    { name: 'Bookings' },
    { name: 'Partner' },
    { name: 'Admin' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    responses: {
      BadRequest: { description: 'Validation failed', content: json({ $ref: '#/components/schemas/Error' }) },
      Unauthorized: { description: 'Not logged in or session expired', content: json({ $ref: '#/components/schemas/Error' }) },
      Forbidden: { description: 'Role not allowed', content: json({ $ref: '#/components/schemas/Error' }) },
      NotFound: { description: 'Resource not found', content: json({ $ref: '#/components/schemas/Error' }) },
      Conflict: { description: 'State conflict (e.g. seat already taken)', content: json({ $ref: '#/components/schemas/Error' }) },
    },
    schemas: {
      Envelope: {
        type: 'object',
        properties: { success: { type: 'boolean' }, message: { type: 'string' }, data: {} },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          details: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['user', 'partner', 'admin'] },
          isActive: { type: 'boolean' },
        },
      },
      Movie: {
        type: 'object',
        required: ['title', 'description', 'durationMinutes', 'releaseDate', 'posterUrl'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          durationMinutes: { type: 'integer', example: 148 },
          genres: { type: 'array', items: { type: 'string' } },
          languages: { type: 'array', items: { type: 'string' } },
          releaseDate: { type: 'string', format: 'date' },
          certificate: { type: 'string', enum: ['U', 'UA', 'A'] },
          posterUrl: { type: 'string' },
          trailerUrl: { type: 'string' },
          director: { type: 'string' },
          cast: { type: 'array', items: { type: 'string' } },
          ratingAverage: { type: 'number', readOnly: true },
          ratingCount: { type: 'integer', readOnly: true },
        },
      },
      Theatre: {
        type: 'object',
        required: ['name', 'address', 'city', 'phone', 'email'],
        properties: {
          name: { type: 'string' },
          address: { type: 'string' },
          city: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          screens: { type: 'integer', minimum: 1, maximum: 20 },
          status: { type: 'string', enum: ['pending', 'approved', 'blocked'], readOnly: true },
        },
      },
      SeatLayout: {
        type: 'object',
        properties: {
          seatsPerRow: { type: 'integer', example: 12 },
          categories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Recliner' },
                price: { type: 'number', example: 450 },
                rows: { type: 'array', items: { type: 'string' }, example: ['A', 'B'] },
              },
            },
          },
        },
      },
      Show: {
        type: 'object',
        required: ['movie', 'theatre', 'startTime', 'language'],
        properties: {
          movie: { type: 'string' },
          theatre: { type: 'string' },
          screen: { type: 'integer' },
          startTime: { type: 'string', format: 'date-time' },
          language: { type: 'string' },
          format: { type: 'string', enum: ['2D', '3D', 'IMAX', '4DX'] },
          seatLayout: { $ref: '#/components/schemas/SeatLayout' },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          seats: { type: 'array', items: { type: 'string' } },
          ticketAmount: { type: 'number' },
          convenienceFee: { type: 'number' },
          totalAmount: { type: 'number' },
          status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED', 'REFUNDED', 'CANCELLED'] },
          ticketCode: { type: 'string', example: 'BMS-7F3A9C21' },
          qrCode: { type: 'string', description: 'PNG data URL (confirmed bookings only)' },
        },
      },
      SeatsBody: {
        type: 'object',
        required: ['seats'],
        properties: { seats: { type: 'array', items: { type: 'string' }, example: ['C5', 'C6'], maxItems: 10 } },
      },
    },
  },
  paths: {
    '/health': { get: { tags: ['Auth'], summary: 'Liveness probe', responses: { 200: ok('API is up') } } },

    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create a customer or partner account',
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['name', 'email', 'password'],
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
              password: { type: 'string', description: 'min 8 chars, a letter and a digit' },
              role: { type: 'string', enum: ['user', 'partner'] },
            },
          }),
        },
        responses: { 201: ok('Registered and logged in'), 400: errors[400], 409: { $ref: '#/components/responses/Conflict' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in (sets the httpOnly token cookie)',
        requestBody: {
          required: true,
          content: json({ type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } }),
        },
        responses: { 200: ok('Logged in'), 401: errors[401], 429: { description: 'Too many attempts' } },
      },
    },
    '/auth/logout': { post: { tags: ['Auth'], summary: 'Clear the session cookie', responses: { 200: ok('Logged out') } } },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Current user', security: secured, responses: { 200: ok('User'), 401: errors[401] } },
      patch: {
        tags: ['Auth'],
        summary: 'Update profile name',
        security: secured,
        requestBody: { content: json({ type: 'object', properties: { name: { type: 'string' } } }) },
        responses: { 200: ok('Updated') },
      },
    },
    '/auth/password': {
      patch: {
        tags: ['Auth'],
        summary: 'Change password',
        security: secured,
        requestBody: {
          content: json({ type: 'object', properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string' } } }),
        },
        responses: { 200: ok('Changed'), 400: errors[400] },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Email a 6-digit reset code (same response whether or not the email exists)',
        requestBody: { content: json({ type: 'object', properties: { email: { type: 'string' } } }) },
        responses: { 200: ok('Code sent if the account exists') },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with the emailed code',
        requestBody: {
          content: json({
            type: 'object',
            properties: { email: { type: 'string' }, otp: { type: 'string', example: '123456' }, password: { type: 'string' } },
          }),
        },
        responses: { 200: ok('Password updated'), 400: errors[400] },
      },
    },

    '/movies': {
      get: {
        tags: ['Movies'],
        summary: 'List movies with search and filters',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'genre', in: 'query', schema: { type: 'string' } },
          { name: 'language', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['now', 'upcoming', 'all'] } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 50 } },
        ],
        responses: { 200: ok('Paginated movies') },
      },
      post: {
        tags: ['Movies'],
        summary: 'Add a movie (admin)',
        security: secured,
        requestBody: { content: json({ $ref: '#/components/schemas/Movie' }) },
        responses: { 201: ok('Created'), 400: errors[400], 403: errors[403] },
      },
    },
    '/movies/filters': { get: { tags: ['Movies'], summary: 'Distinct genres and languages', responses: { 200: ok('Filters') } } },
    '/movies/{id}': {
      parameters: [id],
      get: { tags: ['Movies'], summary: 'Movie details', responses: { 200: ok('Movie'), 404: errors[404] } },
      patch: {
        tags: ['Movies'],
        summary: 'Update a movie (admin)',
        security: secured,
        requestBody: { content: json({ $ref: '#/components/schemas/Movie' }) },
        responses: { 200: ok('Updated'), 403: errors[403] },
      },
      delete: {
        tags: ['Movies'],
        summary: 'Delete a movie without shows (admin)',
        security: secured,
        responses: { 200: ok('Deleted'), 409: { $ref: '#/components/responses/Conflict' } },
      },
    },
    '/movies/{id}/reviews': {
      parameters: [id],
      get: { tags: ['Reviews'], summary: 'Reviews, star histogram and (if logged in) own review + eligibility', responses: { 200: ok('Reviews') } },
      put: {
        tags: ['Reviews'],
        summary: 'Create or update own review (requires having watched the movie)',
        security: secured,
        requestBody: {
          content: json({ type: 'object', properties: { rating: { type: 'integer', minimum: 1, maximum: 5 }, comment: { type: 'string' } } }),
        },
        responses: { 200: ok('Saved'), 403: errors[403] },
      },
      delete: { tags: ['Reviews'], summary: 'Delete own review', security: secured, responses: { 200: ok('Deleted') } },
    },

    '/theatres/cities': { get: { tags: ['Theatres'], summary: 'Cities with approved theatres', responses: { 200: ok('Cities') } } },
    '/theatres/mine': { get: { tags: ['Theatres'], summary: "Partner's theatres", security: secured, responses: { 200: ok('Theatres') } } },
    '/theatres': {
      post: {
        tags: ['Theatres'],
        summary: 'Register a theatre (starts pending)',
        security: secured,
        requestBody: { content: json({ $ref: '#/components/schemas/Theatre' }) },
        responses: { 201: ok('Submitted'), 403: errors[403] },
      },
    },
    '/theatres/{id}': {
      parameters: [id],
      patch: { tags: ['Theatres'], summary: 'Update own theatre', security: secured, responses: { 200: ok('Updated'), 403: errors[403] } },
      delete: { tags: ['Theatres'], summary: 'Delete own theatre without upcoming shows', security: secured, responses: { 200: ok('Deleted') } },
    },

    '/shows/movie/{movieId}': {
      get: {
        tags: ['Shows'],
        summary: 'Showtimes for a movie on an IST day, grouped by theatre',
        parameters: [
          { name: 'movieId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'city', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: ok('Theatres with shows') },
      },
    },
    '/shows': {
      post: {
        tags: ['Shows'],
        summary: 'Schedule a show (partner)',
        security: secured,
        requestBody: { content: json({ $ref: '#/components/schemas/Show' }) },
        responses: { 201: ok('Scheduled'), 409: { $ref: '#/components/responses/Conflict' } },
      },
    },
    '/shows/mine': { get: { tags: ['Shows'], summary: "Partner's shows", security: secured, responses: { 200: ok('Shows') } } },
    '/shows/{id}': {
      parameters: [id],
      get: { tags: ['Shows'], summary: 'Show with movie, theatre and seat layout', responses: { 200: ok('Show'), 404: errors[404] } },
      patch: { tags: ['Shows'], summary: 'Update show (only prices once tickets are sold)', security: secured, responses: { 200: ok('Updated') } },
      delete: { tags: ['Shows'], summary: 'Delete show with no tickets sold', security: secured, responses: { 200: ok('Deleted') } },
    },
    '/shows/{id}/seats': {
      parameters: [id],
      get: { tags: ['Seats'], summary: 'Booked seats and live holds', responses: { 200: ok('Availability') } },
    },
    '/shows/{id}/hold': {
      parameters: [id],
      post: {
        tags: ['Seats'],
        summary: 'Hold seats for a few minutes (replaces previous hold)',
        security: secured,
        requestBody: { content: json({ $ref: '#/components/schemas/SeatsBody' }) },
        responses: { 200: ok('Held, with server-computed price'), 409: { $ref: '#/components/responses/Conflict' } },
      },
      delete: { tags: ['Seats'], summary: 'Release own holds', security: secured, responses: { 200: ok('Released') } },
    },

    '/payments/config': { get: { tags: ['Payments'], summary: 'Whether real Razorpay keys are configured', responses: { 200: ok('Config') } } },
    '/payments/order': {
      post: {
        tags: ['Payments'],
        summary: 'Create a Razorpay order for held seats',
        security: secured,
        requestBody: {
          content: json({ type: 'object', properties: { showId: { type: 'string' }, seats: { type: 'array', items: { type: 'string' } } } }),
        },
        responses: { 201: ok('Order created'), 409: { $ref: '#/components/responses/Conflict' } },
      },
    },
    '/payments/verify': {
      post: {
        tags: ['Payments'],
        summary: 'Verify Razorpay signature and confirm the booking',
        security: secured,
        requestBody: {
          content: json({
            type: 'object',
            properties: { orderId: { type: 'string' }, paymentId: { type: 'string' }, signature: { type: 'string' } },
          }),
        },
        responses: { 200: ok('Booking confirmed'), 400: errors[400], 409: { $ref: '#/components/responses/Conflict' } },
      },
    },
    '/payments/cancel': {
      post: { tags: ['Payments'], summary: 'Customer closed checkout', security: secured, responses: { 200: ok('Cancelled') } },
    },
    '/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Razorpay webhook (HMAC-SHA256 in X-Razorpay-Signature)',
        parameters: [{ name: 'X-Razorpay-Signature', in: 'header', required: true, schema: { type: 'string' } }],
        responses: { 200: ok('Acknowledged'), 400: { description: 'Invalid signature' } },
      },
    },

    '/bookings/me': { get: { tags: ['Bookings'], summary: 'My bookings', security: secured, responses: { 200: ok('Bookings') } } },
    '/bookings/{id}': {
      parameters: [id],
      get: {
        tags: ['Bookings'],
        summary: 'Ticket with QR code and cancellation quote',
        security: secured,
        responses: { 200: ok('Booking', { $ref: '#/components/schemas/Booking' }), 404: errors[404] },
      },
    },
    '/bookings/{id}/cancel': {
      parameters: [id],
      post: { tags: ['Bookings'], summary: 'Cancel with tiered refund', security: secured, responses: { 200: ok('Cancelled'), 400: errors[400] } },
    },

    '/partner/stats': { get: { tags: ['Partner'], summary: 'Revenue, tickets and occupancy', security: secured, responses: { 200: ok('Stats') } } },
    '/partner/bookings': {
      get: {
        tags: ['Partner'],
        summary: 'Confirmed bookings for own theatres',
        security: secured,
        parameters: [{ name: 'show', in: 'query', schema: { type: 'string' } }],
        responses: { 200: ok('Bookings') },
      },
    },
    '/partner/checkin': {
      post: {
        tags: ['Partner'],
        summary: 'Admit a ticket by QR payload or booking code',
        security: secured,
        requestBody: { content: json({ type: 'object', properties: { code: { type: 'string' } } }) },
        responses: { 200: ok('Admitted'), 409: { $ref: '#/components/responses/Conflict' } },
      },
    },

    '/admin/stats': { get: { tags: ['Admin'], summary: 'Platform KPIs', security: secured, responses: { 200: ok('Stats') } } },
    '/admin/users': {
      get: {
        tags: ['Admin'],
        summary: 'List users',
        security: secured,
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['user', 'partner', 'admin'] } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: ok('Users') },
      },
    },
    '/admin/users/{id}/status': {
      parameters: [id],
      patch: {
        tags: ['Admin'],
        summary: 'Activate or deactivate a user',
        security: secured,
        requestBody: { content: json({ type: 'object', properties: { isActive: { type: 'boolean' } } }) },
        responses: { 200: ok('Updated') },
      },
    },
    '/admin/theatres': {
      get: {
        tags: ['Admin'],
        summary: 'Theatres by status',
        security: secured,
        parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'approved', 'blocked'] } }],
        responses: { 200: ok('Theatres') },
      },
    },
    '/admin/theatres/{id}/status': {
      parameters: [id],
      patch: {
        tags: ['Admin'],
        summary: 'Approve, block (with reason) or reset a theatre',
        security: secured,
        requestBody: {
          content: json({
            type: 'object',
            properties: { status: { type: 'string', enum: ['approved', 'blocked', 'pending'] }, reason: { type: 'string' } },
          }),
        },
        responses: { 200: ok('Updated') },
      },
    },
  },
};
