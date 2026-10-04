const { loginAs } = require('./helpers');
const { hoursFromNow, seedMovieAndTheatre } = require('./fixtures');
const Show = require('../src/models/Show');
const { DEFAULT_LAYOUT } = require('../src/utils/seats');
const { signTicket } = require('../src/services/ticket.service');

/**
 * Books seats end-to-end through the API (hold -> order -> verify) so the
 * dashboards are tested against realistic data.
 */
async function bookSeats(show, seats) {
  const { agent } = await loginAs('user');
  await agent.post(`/api/shows/${show._id}/hold`).send({ seats }).expect(200);
  const { body } = await agent.post('/api/payments/order').send({ showId: String(show._id), seats });
  const res = await agent
    .post('/api/payments/verify')
    .send({ orderId: body.data.order.id, paymentId: `pay_mock_${Date.now()}`, signature: 'mock_signature' });
  return res.body.data;
}

describe('Dashboards and check-in', () => {
  let partner;
  let show;

  beforeEach(async () => {
    const session = await loginAs('partner');
    partner = session.agent;
    const { movie, theatre } = await seedMovieAndTheatre(session.user);
    show = await Show.create({
      movie: movie._id,
      theatre: theatre._id,
      startTime: hoursFromNow(24),
      endTime: hoursFromNow(27),
      language: 'English',
      seatLayout: DEFAULT_LAYOUT,
    });
  });

  test('partner stats reflect confirmed bookings', async () => {
    await bookSeats(show, ['A1', 'A2']);
    await bookSeats(show, ['G1']);

    const res = await partner.get('/api/partner/stats');
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toMatchObject({ bookings: 2, tickets: 3, revenue: 450 * 2 + 180 });
    expect(res.body.data.daily).toHaveLength(14);
    expect(res.body.data.daily.at(-1).tickets).toBe(3);
    expect(res.body.data.topMovies[0].title).toBe('Interstellar Drift');
    expect(res.body.data.upcoming[0]).toMatchObject({ booked: 3, total: 120 });
  });

  test("partners only see their own theatres' numbers", async () => {
    await bookSeats(show, ['B1']);
    const { agent: other } = await loginAs('partner');
    const res = await other.get('/api/partner/stats');
    expect(res.body.data.summary.bookings).toBe(0);
  });

  test('admin stats aggregate the whole platform', async () => {
    await bookSeats(show, ['C1']);
    const { agent: admin } = await loginAs('admin');
    const res = await admin.get('/api/admin/stats');
    expect(res.body.data.summary).toMatchObject({ bookings: 1, revenue: 250, fees: 25 });
    expect(res.body.data.users.partner).toBe(1);
    expect(res.body.data.theatres.approved).toBe(1);
  });

  test('check-in admits a ticket once via QR payload or ticket code', async () => {
    const booking = await bookSeats(show, ['D4']);

    const first = await partner.post('/api/partner/checkin').send({ code: signTicket(booking._id) });
    expect(first.status).toBe(200);
    expect(first.body.data.checkedInAt).toBeTruthy();

    const again = await partner.post('/api/partner/checkin').send({ code: booking.ticketCode });
    expect(again.status).toBe(409);
  });

  test('another partner cannot check in my tickets; forged codes are rejected', async () => {
    const booking = await bookSeats(show, ['D5']);
    const { agent: other } = await loginAs('partner');
    expect((await other.post('/api/partner/checkin').send({ code: booking.ticketCode })).status).toBe(403);
    expect((await partner.post('/api/partner/checkin').send({ code: `${booking._id}.forged` })).status).toBe(404);
  });
});
