const Movie = require('../src/models/Movie');
const Theatre = require('../src/models/Theatre');

/**
 * Builders for valid request payloads and seeded documents, shared across test files.
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

/** A date `hours` from now, handy for future show times. */
const hoursFromNow = (hours) => new Date(Date.now() + hours * 60 * 60 * 1000);

/**
 * Inserts an active movie and an approved theatre owned by `owner`.
 * @param {{ _id: any }} owner
 */
async function seedMovieAndTheatre(owner, theatreOverrides = {}) {
  const movie = await Movie.create(movieBody());
  const theatre = await Theatre.create({ ...theatreBody(theatreOverrides), owner: owner._id, status: 'approved' });
  return { movie, theatre };
}

module.exports = { movieBody, theatreBody, hoursFromNow, seedMovieAndTheatre };
