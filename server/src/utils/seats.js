const ApiError = require('./ApiError');

/**
 * Layout used when a partner does not configure one.
 * Categories are listed from the back of the hall to the front; the client
 * renders them top-down with the screen at the bottom, as on popular ticketing apps.
 */
const DEFAULT_LAYOUT = Object.freeze({
  seatsPerRow: 12,
  categories: [
    { name: 'Recliner', price: 450, rows: ['A', 'B'] },
    { name: 'Prime', price: 250, rows: ['C', 'D', 'E', 'F'] },
    { name: 'Classic', price: 180, rows: ['G', 'H', 'I', 'J'] },
  ],
});

/** Max seats a single booking may contain — mirrors common cinema policy. */
const MAX_SEATS_PER_BOOKING = 10;

/**
 * Builds a lookup of every valid seat id ("A1", "A2", ...) to its tier.
 * @param {{ seatsPerRow: number, categories: { name: string, price: number, rows: string[] }[] }} layout
 * @returns {Map<string, { row: string, number: number, category: string, price: number }>}
 */
function buildSeatIndex(layout) {
  const index = new Map();
  for (const category of layout.categories) {
    for (const row of category.rows) {
      for (let n = 1; n <= layout.seatsPerRow; n += 1) {
        index.set(`${row}${n}`, { row, number: n, category: category.name, price: category.price });
      }
    }
  }
  return index;
}

/**
 * Validates that the requested seats exist in the layout and computes the
 * price on the server. The client-side total is never trusted.
 * @param {Parameters<typeof buildSeatIndex>[0]} layout
 * @param {string[]} seatIds
 */
function priceSeats(layout, seatIds) {
  const index = buildSeatIndex(layout);
  const unique = [...new Set(seatIds.map((s) => String(s).toUpperCase()))];

  if (!unique.length) throw ApiError.badRequest('Select at least one seat');
  if (unique.length > MAX_SEATS_PER_BOOKING) {
    throw ApiError.badRequest(`You can book at most ${MAX_SEATS_PER_BOOKING} seats at a time`);
  }

  const invalid = unique.filter((id) => !index.has(id));
  if (invalid.length) throw ApiError.badRequest(`Invalid seat(s): ${invalid.join(', ')}`);

  const items = unique.map((id) => ({ seat: id, ...index.get(id) }));
  const total = items.reduce((sum, item) => sum + item.price, 0);
  return { seats: unique, items, total };
}

/**
 * Ensures row labels are unique across tiers so each seat id maps to one price.
 * @param {Parameters<typeof buildSeatIndex>[0]} layout
 */
function assertValidLayout(layout) {
  const rows = layout.categories.flatMap((c) => c.rows.map((r) => r.toUpperCase()));
  if (new Set(rows).size !== rows.length) throw ApiError.badRequest('Row labels must be unique across categories');
}

module.exports = { DEFAULT_LAYOUT, MAX_SEATS_PER_BOOKING, buildSeatIndex, priceSeats, assertValidLayout };
