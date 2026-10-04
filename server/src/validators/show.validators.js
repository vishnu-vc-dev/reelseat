const { z, objectId } = require('./common');
const { FORMATS } = require('../models/Show');

const seatLayout = z.object({
  seatsPerRow: z.coerce.number().int().min(1).max(40),
  categories: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(30),
        price: z.coerce.number().min(0).max(10000),
        rows: z
          .array(
            z
              .string()
              .trim()
              .toUpperCase()
              .regex(/^[A-Z]{1,2}$/, 'Row labels must be letters'),
          )
          .min(1),
      }),
    )
    .min(1)
    .max(6),
});

const editableFields = {
  screen: z.coerce.number().int().min(1),
  startTime: z.coerce.date(),
  language: z.string().trim().min(1).max(30),
  format: z.enum(FORMATS),
  seatLayout,
};

const createShow = z.object({
  movie: objectId,
  theatre: objectId,
  ...editableFields,
  screen: editableFields.screen.default(1),
  format: editableFields.format.default('2D'),
  seatLayout: seatLayout.optional(),
});

/**
 * Built from the raw fields rather than `createShow.partial()`, because zod
 * keeps `.default()` values on partial schemas, which would silently reset
 * screen/format on every PATCH. Once tickets are sold only pricing can change;
 * that rule is enforced in the controller.
 */
const updateShow = z.object(editableFields).partial();

const byMovieParams = z.object({ movieId: objectId });
const byMovieQuery = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
    .optional(),
  city: z.string().trim().max(60).optional(),
});

const mineQuery = z.object({
  theatre: objectId.optional(),
  upcoming: z.coerce.boolean().optional(),
});

module.exports = { createShow, updateShow, byMovieParams, byMovieQuery, mineQuery };
