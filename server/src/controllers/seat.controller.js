const asyncHandler = require('../utils/asyncHandler');
const seatService = require('../services/seat.service');

/** GET /api/shows/:id/seats — booked + held seats; caller's own holds flagged. */
const availability = asyncHandler(async (req, res) => {
  const data = await seatService.getAvailability(req.params.id, req.user?._id);
  res.json({ success: true, data });
});

/** POST /api/shows/:id/hold — replace the caller's hold with the given seats. */
const hold = asyncHandler(async (req, res) => {
  const data = await seatService.holdSeats(req.params.id, req.user._id, req.body.seats);
  res.json({ success: true, message: 'Seats held', data });
});

/** DELETE /api/shows/:id/hold */
const release = asyncHandler(async (req, res) => {
  const seats = await seatService.releaseHolds(req.params.id, req.user._id);
  res.json({ success: true, message: 'Seats released', data: { seats } });
});

module.exports = { availability, hold, release };
