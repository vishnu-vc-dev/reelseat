const { loginAs } = require('./helpers');
const { hoursFromNow, seedMovieAndTheatre } = require('./fixtures');
const Show = require('../src/models/Show');
const Booking = require('../src/models/Booking');
const { DEFAULT_LAYOUT } = require('../src/utils/seats');
const { quote } = require('../src/services/cancellation.service');

/** Creates a show `hours` from now and books `seats` on it through the API. */
async function bookShowIn(hours, seats = ['B1', 'B2']) {
  const { user: owner } = await loginAs('partner');
  const { movie, theatre } = await seedMovieAndTheatre(owner);
  const show = await Show.create({
    movie: movie._id,
    theatre: theatre._id,
    startTime: hoursFromNow(hours),
    endTime: hoursFromNow(hours + 3),
    language: 'English',
    seatLayout: DEFAULT_LAYOUT,
  });
  const { agent } = await loginAs('user');
  await agent.post(`/api/shows/${show._id}/hold`).send({ seats }).expect(200);
  const { body } = await agent.post('/api/payments/order').send({ showId: String(show._id), seats });
  const res = await agent
    .post('/api/payments/verify')
    .send({ orderId: body.data.order.id, paymentId: 'pay_mock_cancel', signature: 'mock_signature' });
  return { agent, show, booking: res.body.data };
}

describe('Booking cancellation', () => {
  test('full refund of the ticket amount more than 24h before the show; seats are released', async () => {
    const { agent, show, booking } = await bookShowIn(48);

    const details = await agent.get(`/api/bookings/${booking._id}`);
    expect(details.body.data.cancellation).toMatchObject({ allowed: true, refundAmount: 900, refundPercent: 100 });

    const res = await agent.post(`/api/bookings/${booking._id}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');
    expect(res.body.data.refundAmount).toBe(900);
    expect(res.body.data.payment.refundId).toMatch(/^rfnd_/);
    expect((await Show.findById(show._id)).bookedSeats).toEqual([]);
  });

  test('75% refund between 2 and 24 hours; blocked inside 2 hours', () => {
    const start = hoursFromNow(5);
    expect(quote({ status: 'CONFIRMED', ticketAmount: 400 }, start)).toMatchObject({ allowed: true, refundAmount: 300 });
    expect(quote({ status: 'CONFIRMED', ticketAmount: 400 }, hoursFromNow(1)).allowed).toBe(false);
    expect(quote({ status: 'CONFIRMED', ticketAmount: 400, checkedInAt: new Date() }, start).allowed).toBe(false);
  });

  test('cannot cancel twice or cancel someone else’s booking', async () => {
    const { agent, booking } = await bookShowIn(48);
    const { agent: other } = await loginAs('user');
    expect((await other.post(`/api/bookings/${booking._id}/cancel`)).status).toBe(404);

    const [a, b] = await Promise.all([
      agent.post(`/api/bookings/${booking._id}/cancel`),
      agent.post(`/api/bookings/${booking._id}/cancel`),
    ]);
    /** Exactly one request wins; the other sees the booking already cancelled. */
    expect([a.status, b.status].filter((s) => s === 200)).toHaveLength(1);
    expect((await Booking.findById(booking._id)).status).toBe('CANCELLED');
  });

  test('cancelled bookings drop out of partner revenue', async () => {
    const { agent, booking } = await bookShowIn(48);
    await agent.post(`/api/bookings/${booking._id}/cancel`).expect(200);
    const { agent: admin } = await loginAs('admin');
    const stats = await admin.get('/api/admin/stats');
    expect(stats.body.data.summary.bookings).toBe(0);
  });
});
