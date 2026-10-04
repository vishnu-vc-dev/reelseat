const { app, request, loginAs } = require('./helpers');
const { hoursFromNow, seedMovieAndTheatre } = require('./fixtures');
const Show = require('../src/models/Show');
const SeatHold = require('../src/models/SeatHold');
const { DEFAULT_LAYOUT } = require('../src/utils/seats');
const { sweepExpiredHolds } = require('../src/services/seat.service');

describe('Seat holds', () => {
  let show;

  beforeEach(async () => {
    const { user: owner } = await loginAs('partner');
    const { movie, theatre } = await seedMovieAndTheatre(owner);
    const startTime = hoursFromNow(24);
    show = await Show.create({
      movie: movie._id,
      theatre: theatre._id,
      startTime,
      endTime: hoursFromNow(27),
      language: 'English',
      seatLayout: DEFAULT_LAYOUT,
      bookedSeats: ['J12'],
    });
  });

  test('holds seats, prices them server-side and reports them as mine', async () => {
    const { agent } = await loginAs('user');
    const res = await agent.post(`/api/shows/${show._id}/hold`).send({ seats: ['a1', 'C5', 'G2'] });

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(450 + 250 + 180);
    expect(res.body.data.seats).toEqual(['A1', 'C5', 'G2']);

    const availability = await agent.get(`/api/shows/${show._id}/seats`);
    expect(availability.body.data.booked).toEqual(['J12']);
    expect(availability.body.data.held.every((h) => h.mine)).toBe(true);
  });

  test('a second customer cannot hold a seat that is already held', async () => {
    const { agent: first } = await loginAs('user');
    const { agent: second } = await loginAs('user');

    await first.post(`/api/shows/${show._id}/hold`).send({ seats: ['B3', 'B4'] }).expect(200);
    const res = await second.post(`/api/shows/${show._id}/hold`).send({ seats: ['B4', 'B5'] });

    expect(res.status).toBe(409);
    expect(res.body.details.seats).toEqual(['B4']);
    /** The failed attempt must not leave B5 half-held. */
    expect(await SeatHold.countDocuments({ seat: 'B5' })).toBe(0);
  });

  test('concurrent holds on the same seat: exactly one wins', async () => {
    const users = await Promise.all(Array.from({ length: 5 }, () => loginAs('user')));
    const results = await Promise.all(
      users.map(({ agent }) => agent.post(`/api/shows/${show._id}/hold`).send({ seats: ['D7'] })),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
  });

  test('re-holding replaces the previous selection; release frees everything', async () => {
    const { agent } = await loginAs('user');
    await agent.post(`/api/shows/${show._id}/hold`).send({ seats: ['E1', 'E2'] });
    await agent.post(`/api/shows/${show._id}/hold`).send({ seats: ['E3'] });
    expect(await SeatHold.find().distinct('seat')).toEqual(['E3']);

    await agent.delete(`/api/shows/${show._id}/hold`).expect(200);
    expect(await SeatHold.countDocuments()).toBe(0);
  });

  test('rejects sold seats, unknown seats and anonymous users', async () => {
    const { agent } = await loginAs('user');
    expect((await agent.post(`/api/shows/${show._id}/hold`).send({ seats: ['J12'] })).status).toBe(409);
    expect((await agent.post(`/api/shows/${show._id}/hold`).send({ seats: ['Z1'] })).status).toBe(400);
    expect((await request(app).post(`/api/shows/${show._id}/hold`).send({ seats: ['A1'] })).status).toBe(401);
  });

  test('expired holds stop blocking seats and are swept', async () => {
    const { user } = await loginAs('user');
    await SeatHold.create({ show: show._id, seat: 'F1', user: user._id, expiresAt: new Date(Date.now() - 1000) });

    const { agent } = await loginAs('user');
    expect((await agent.post(`/api/shows/${show._id}/hold`).send({ seats: ['F1'] })).status).toBe(200);

    await SeatHold.create({ show: show._id, seat: 'F9', user: user._id, expiresAt: new Date(Date.now() - 1000) });
    expect(await sweepExpiredHolds()).toBe(1);
  });
});
