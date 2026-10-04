import http from './http';

/**
 * Thin, typed-by-convention wrappers around the REST API.
 * Each function resolves with the `{ success, data, meta? }` envelope.
 */

export const authApi = {
  me: () => http.get('/auth/me'),
  login: (body) => http.post('/auth/login', body),
  register: (body) => http.post('/auth/register', body),
  logout: () => http.post('/auth/logout'),
  forgotPassword: (email) => http.post('/auth/forgot-password', { email }),
  resetPassword: (body) => http.post('/auth/reset-password', body),
  changePassword: (body) => http.patch('/auth/password', body),
  updateProfile: (body) => http.patch('/auth/me', body),
};

export const movieApi = {
  list: (params) => http.get('/movies', { params }),
  filters: () => http.get('/movies/filters'),
  get: (id) => http.get(`/movies/${id}`),
  create: (body) => http.post('/movies', body),
  update: (id, body) => http.patch(`/movies/${id}`, body),
  remove: (id) => http.delete(`/movies/${id}`),
  reviews: (id, params) => http.get(`/movies/${id}/reviews`, { params }),
  saveReview: (id, body) => http.put(`/movies/${id}/reviews`, body),
  deleteReview: (id) => http.delete(`/movies/${id}/reviews`),
};

export const theatreApi = {
  cities: () => http.get('/theatres/cities'),
  mine: () => http.get('/theatres/mine'),
  create: (body) => http.post('/theatres', body),
  update: (id, body) => http.patch(`/theatres/${id}`, body),
  remove: (id) => http.delete(`/theatres/${id}`),
};

export const showApi = {
  forMovie: (movieId, params) => http.get(`/shows/movie/${movieId}`, { params }),
  get: (id) => http.get(`/shows/${id}`),
  seats: (id) => http.get(`/shows/${id}/seats`),
  hold: (id, seats) => http.post(`/shows/${id}/hold`, { seats }),
  release: (id) => http.delete(`/shows/${id}/hold`),
  mine: (params) => http.get('/shows/mine', { params }),
  create: (body) => http.post('/shows', body),
  update: (id, body) => http.patch(`/shows/${id}`, body),
  remove: (id) => http.delete(`/shows/${id}`),
};

export const paymentApi = {
  config: () => http.get('/payments/config'),
  createOrder: (showId, seats) => http.post('/payments/order', { showId, seats }),
  verify: (body) => http.post('/payments/verify', body),
  cancel: (orderId) => http.post('/payments/cancel', { orderId }),
};

export const bookingApi = {
  mine: () => http.get('/bookings/me'),
  get: (id) => http.get(`/bookings/${id}`),
  cancel: (id) => http.post(`/bookings/${id}/cancel`),
};

export const partnerApi = {
  stats: () => http.get('/partner/stats'),
  bookings: (params) => http.get('/partner/bookings', { params }),
  checkIn: (code) => http.post('/partner/checkin', { code }),
};

export const adminApi = {
  stats: () => http.get('/admin/stats'),
  users: (params) => http.get('/admin/users', { params }),
  setUserActive: (id, isActive) => http.patch(`/admin/users/${id}/status`, { isActive }),
  theatres: (params) => http.get('/admin/theatres', { params }),
  setTheatreStatus: (id, body) => http.patch(`/admin/theatres/${id}/status`, body),
};
