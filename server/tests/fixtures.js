/**
 * Builders for valid request payloads, shared across test files.
 */
const movieBody = (overrides = {}) => ({
  title: 'Interstellar Drift',
  description: 'A crew crosses a wormhole to find a new home for humanity.',
  durationMinutes: 150,
  genres: ['Sci-Fi', 'Drama'],
  languages: ['English', 'Hindi'],
  releaseDate: '2026-01-10',
  certificate: 'UA',
  posterUrl: 'https://images.example.com/poster.jpg',
  ...overrides,
});

const theatreBody = (overrides = {}) => ({
  name: 'Galaxy Cinemas',
  address: '12 MG Road, Indiranagar',
  city: 'Bengaluru',
  phone: '+91 9876543210',
  email: 'galaxy@example.com',
  screens: 2,
  ...overrides,
});

module.exports = { movieBody, theatreBody };
