const { z } = require('./common');
const { CERTIFICATES } = require('../models/Movie');

/** Accepts either an array or a comma separated string from form inputs. */
const stringList = z
  .union([z.array(z.string()), z.string()])
  .transform((v) => (Array.isArray(v) ? v : v.split(',')))
  .transform((list) => list.map((s) => s.trim()).filter(Boolean));

const url = z.url('Must be a valid URL');

const movieFields = {
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(10).max(2000),
  durationMinutes: z.coerce.number().int().min(1).max(600),
  genres: stringList,
  languages: stringList,
  releaseDate: z.coerce.date(),
  certificate: z.enum(CERTIFICATES),
  posterUrl: url,
  trailerUrl: url.optional().or(z.literal('')),
  director: z.string().trim().max(80).optional(),
  cast: stringList,
  isActive: z.boolean().optional(),
};

const createMovie = z.object({
  ...movieFields,
  genres: movieFields.genres.default([]),
  languages: movieFields.languages.default([]),
  certificate: movieFields.certificate.default('UA'),
  cast: movieFields.cast.default([]),
});

/** Defaults are deliberately absent so a partial update never overwrites untouched fields. */
const updateMovie = z.object(movieFields).partial();

const listMovies = z.object({
  search: z.string().trim().max(100).optional(),
  genre: z.string().trim().optional(),
  language: z.string().trim().optional(),
  /** now = released, upcoming = release date in the future */
  status: z.enum(['now', 'upcoming', 'all']).default('all'),
  includeInactive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

module.exports = { createMovie, updateMovie, listMovies };
