const { app, request, loginAs } = require('./helpers');
const { movieBody, theatreBody } = require('./fixtures');

describe('Movies', () => {
  test('only admins can add movies', async () => {
    const { agent: user } = await loginAs('user');
    expect((await user.post('/api/movies').send(movieBody())).status).toBe(403);

    const { agent: admin } = await loginAs('admin');
    const res = await admin.post('/api/movies').send(movieBody());
    expect(res.status).toBe(201);
    expect(res.body.data.genres).toEqual(['Sci-Fi', 'Drama']);
  });

  test('lists, searches and filters the public catalogue', async () => {
    const { agent: admin } = await loginAs('admin');
    await admin.post('/api/movies').send(movieBody());
    await admin.post('/api/movies').send(movieBody({ title: 'Monsoon Wedding Bells', genres: 'Romance, Comedy' }));
    await admin.post('/api/movies').send(movieBody({ title: 'Hidden Gem', isActive: false }));

    const all = await request(app).get('/api/movies');
    expect(all.body.meta.total).toBe(2);

    const search = await request(app).get('/api/movies').query({ search: 'wedding' });
    expect(search.body.data.map((m) => m.title)).toEqual(['Monsoon Wedding Bells']);

    const byGenre = await request(app).get('/api/movies').query({ genre: 'romance' });
    expect(byGenre.body.data).toHaveLength(1);

    const adminView = await admin.get('/api/movies').query({ includeInactive: true });
    expect(adminView.body.meta.total).toBe(3);
  });

  test('returns 400 for malformed ids and 404 for missing movies', async () => {
    expect((await request(app).get('/api/movies/not-an-id')).status).toBe(400);
    expect((await request(app).get('/api/movies/64b7f9f9f9f9f9f9f9f9f9f9')).status).toBe(404);
  });
});

describe('Theatres', () => {
  test('partner creates a pending theatre; admin approves it', async () => {
    const { agent: partner } = await loginAs('partner');
    const created = await partner.post('/api/theatres').send(theatreBody());
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('pending');

    expect((await request(app).get('/api/theatres/cities')).body.data).toEqual([]);

    const { agent: admin } = await loginAs('admin');
    const pending = await admin.get('/api/admin/theatres').query({ status: 'pending' });
    expect(pending.body.data).toHaveLength(1);

    const approved = await admin
      .patch(`/api/admin/theatres/${created.body.data._id}/status`)
      .send({ status: 'approved' });
    expect(approved.body.data.status).toBe('approved');

    expect((await request(app).get('/api/theatres/cities')).body.data).toEqual(['Bengaluru']);
  });

  test('customers cannot create theatres and partners cannot edit others', async () => {
    const { agent: user } = await loginAs('user');
    expect((await user.post('/api/theatres').send(theatreBody())).status).toBe(403);

    const { agent: owner } = await loginAs('partner');
    const { body } = await owner.post('/api/theatres').send(theatreBody());

    const { agent: other } = await loginAs('partner');
    const res = await other.patch(`/api/theatres/${body.data._id}`).send({ name: 'Hijacked' });
    expect(res.status).toBe(403);
  });

  test('partners cannot approve their own theatre', async () => {
    const { agent: partner } = await loginAs('partner');
    const { body } = await partner.post('/api/theatres').send(theatreBody());
    const res = await partner.patch(`/api/theatres/${body.data._id}`).send({ status: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('pending');
  });
});
