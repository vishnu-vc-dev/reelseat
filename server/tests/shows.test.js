const { app, request, loginAs } = require('./helpers');
const { hoursFromNow, seedMovieAndTheatre } = require('./fixtures');
const Theatre = require('../src/models/Theatre');
const Show = require('../src/models/Show');

describe('Shows', () => {
  let partner;
  let movie;
  let theatre;

  beforeEach(async () => {
    const session = await loginAs('partner');
    partner = session.agent;
    ({ movie, theatre } = await seedMovieAndTheatre(session.user));
  });

  const showBody = (overrides = {}) => ({
    movie: String(movie._id),
    theatre: String(theatre._id),
    screen: 1,
    startTime: hoursFromNow(48).toISOString(),
    language: 'English',
    ...overrides,
  });

  test('schedules a show with the default tiered layout and computed end time', async () => {
    const res = await partner.post('/api/shows').send(showBody());
    expect(res.status).toBe(201);
    expect(res.body.data.seatLayout.categories.map((c) => c.name)).toEqual(['Recliner', 'Prime', 'Classic']);
    expect(res.body.data.totalSeats).toBe(120);

    const duration = new Date(res.body.data.endTime) - new Date(res.body.data.startTime);
    expect(duration).toBe((150 + 15) * 60 * 1000);
  });

  test('rejects overlapping shows on the same screen but allows another screen', async () => {
    await partner.post('/api/shows').send(showBody()).expect(201);

    const clash = await partner.post('/api/shows').send(showBody({ startTime: hoursFromNow(49).toISOString() }));
    expect(clash.status).toBe(409);

    const otherScreen = await partner
      .post('/api/shows')
      .send(showBody({ screen: 2, startTime: hoursFromNow(49).toISOString() }));
    expect(otherScreen.status).toBe(201);
  });

  test('validates theatre approval, screens, language and time', async () => {
    expect((await partner.post('/api/shows').send(showBody({ screen: 5 }))).status).toBe(400);
    expect((await partner.post('/api/shows').send(showBody({ language: 'Tamil' }))).status).toBe(400);
    expect((await partner.post('/api/shows').send(showBody({ startTime: hoursFromNow(-1) }))).status).toBe(400);

    await Theatre.updateOne({ _id: theatre._id }, { status: 'pending' });
    expect((await partner.post('/api/shows').send(showBody())).status).toBe(400);
  });

  test('another partner cannot schedule shows in my theatre', async () => {
    const { agent: other } = await loginAs('partner');
    expect((await other.post('/api/shows').send(showBody())).status).toBe(403);
  });

  test('public showtimes are grouped by theatre and filtered by city/day', async () => {
    const start = hoursFromNow(2);
    await partner.post('/api/shows').send(showBody({ startTime: start.toISOString() })).expect(201);

    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(start);
    const res = await request(app).get(`/api/shows/movie/${movie._id}`).query({ date, city: 'bengaluru' });
    expect(res.status).toBe(200);
    expect(res.body.data.theatres).toHaveLength(1);
    expect(res.body.data.theatres[0].theatre.name).toBe('Galaxy Cinemas');
    expect(res.body.data.theatres[0].shows[0]).toMatchObject({ availableSeats: 120, minPrice: 180 });

    const otherCity = await request(app).get(`/api/shows/movie/${movie._id}`).query({ date, city: 'Pune' });
    expect(otherCity.body.data.theatres).toHaveLength(0);
  });

  test('once tickets are sold only prices can change and the show cannot be deleted', async () => {
    const { body } = await partner.post('/api/shows').send(showBody());
    await Show.updateOne({ _id: body.data._id }, { $push: { bookedSeats: 'A1' } });

    const move = await partner.patch(`/api/shows/${body.data._id}`).send({ startTime: hoursFromNow(72) });
    expect(move.status).toBe(409);

    const layout = { ...body.data.seatLayout };
    layout.categories = layout.categories.map((c) => ({ ...c, price: c.price + 50 }));
    const reprice = await partner.patch(`/api/shows/${body.data._id}`).send({ seatLayout: layout });
    expect(reprice.status).toBe(200);
    expect(reprice.body.data.seatLayout.categories[0].price).toBe(500);

    expect((await partner.delete(`/api/shows/${body.data._id}`)).status).toBe(409);
  });
});
