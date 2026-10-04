/** Same tiers the server uses when no layout is supplied. */
export const DEFAULT_LAYOUT = {
  seatsPerRow: 12,
  categories: [
    { name: 'Recliner', price: 450, rows: ['A', 'B'] },
    { name: 'Prime', price: 250, rows: ['C', 'D', 'E', 'F'] },
    { name: 'Classic', price: 180, rows: ['G', 'H', 'I', 'J'] },
  ],
};
