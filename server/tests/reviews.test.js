const { app, request, loginAs } = require('./helpers');
const { hoursFromNow, seedMovieAndTheatre } = require('./fixtures');
const Show = require('../src/models/Show');
const Booking = require('../src/models/Booking');
const Movie = require('../src/models/Movie');
const { DEFAULT_LAYOUT } = require('../src/utils/seats');

/** Inserts a confirmed booking for `user` on a show starting `hours` from now. */
async function attend(user, movie, theatre, hours) {
  const show = await Show.create({
    movie: movie._id,
    theatre: theatre._id,
    startTime: hoursFromNow(hours),
    endTime: hoursFromNow(hours + 3),
    language: 'English',
    seatLayout: DEFAULT_LAYOUT,
    bookedSeats: ['A1'],
  });
  await Booking.create({
    user: user._id,
    show: show._id,
    theatre: theatre._id,
    movie: movie._id,
    seats: ['A1'],
    items: [{ seat: 'A1', category: 'Recliner', price: 450 }],
    ticketAmount: 450,
    convenienceFee: 25,
    totalAmount: 475,
    status: 'CONFIRMED',
    payment: { provider: 'mock', orderId: `order_${Math.random()}` },
    confirmedAt: new Date(),
  });
}

describe('Reviews', () => {
  let movie;
  let theatre;

  beforeEach(async () => {
    const { user: owner } = await loginAs('partner');
    ({ movie, theatre } = await seedMovieAndTheatre(owner));
  });

  test('only customers who watched the movie can review it', async () => {
    const { agent, user } = await loginAs('user');
    expect((await agent.put(`/api/movies/${movie._id}/reviews`).send({ rating: 5 })).status).toBe(403);

    await attend(user, movie, theatre, 24);
    expect((await agent.put(`/api/movies/${movie._id}/reviews`).send({ rating: 5 })).status).toBe(403);

    await attend(user, movie, theatre, -3);
    const res = await agent.put(`/api/movies/${movie._id}/reviews`).send({ rating: 5, comment: 'Stunning!' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Test user');
  });

  test('keeps one review per customer and maintains the movie rating summary', async () => {
    const a = await loginAs('user');
    const b = await loginAs('user');
    await attend(a.user, movie, theatre, -3);
    await attend(b.user, movie, theatre, -3);

    await a.agent.put(`/api/movies/${movie._id}/reviews`).send({ rating: 5 });
    await a.agent.put(`/api/movies/${movie._id}/reviews`).send({ rating: 4, comment: 'Changed my mind' });
    await b.agent.put(`/api/movies/${movie._id}/reviews`).send({ rating: 3 });

    const fresh = await Movie.findById(movie._id);
    expect(fresh.ratingCount).toBe(2);
    expect(fresh.ratingAverage).toBe(3.5);

    const list = await request(app).get(`/api/movies/${movie._id}/reviews`);
    expect(list.body.data.total).toBe(2);
    expect(list.body.data.histogram).toMatchObject({ 3: 1, 4: 1, 5: 0 });

    const mine = await a.agent.get(`/api/movies/${movie._id}/reviews`);
    expect(mine.body.data.mine.rating).toBe(4);
    expect(mine.body.data.canReview).toBe(true);

    await a.agent.delete(`/api/movies/${movie._id}/reviews`).expect(200);
    expect((await Movie.findById(movie._id)).ratingAverage).toBe(3);
  });

  test('rejects ratings outside 1-5', async () => {
    const { agent, user } = await loginAs('user');
    await attend(user, movie, theatre, -3);
    expect((await agent.put(`/api/movies/${movie._id}/reviews`).send({ rating: 6 })).status).toBe(400);
  });
});
