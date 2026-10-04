const { app, request, loginAs } = require('./helpers');
const User = require('../src/models/User');

describe('Auth', () => {
  const body = { name: 'Asha Rao', email: 'Asha@Example.com', password: 'secret123' };

  test('registers a user, hashes the password and sets an httpOnly cookie', async () => {
    const res = await request(app).post('/api/auth/register').send(body);

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('asha@example.com');
    expect(res.body.data.password).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/token=.+HttpOnly/i);

    const stored = await User.findOne({ email: 'asha@example.com' }).select('+password');
    expect(stored.password).not.toBe(body.password);
    expect(stored.password).toMatch(/^\$2[aby]\$12\$/);
  });

  test('rejects self-registration as admin', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...body, role: 'admin' });
    expect(res.status).toBe(400);
  });

  test('rejects weak passwords and invalid emails', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'X Y', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    const fields = res.body.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['body.email', 'body.password']));
  });

  test('prevents duplicate accounts', async () => {
    await request(app).post('/api/auth/register').send(body);
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(409);
  });

  test('login returns the same error for unknown email and wrong password', async () => {
    await request(app).post('/api/auth/register').send(body);
    const wrongPass = await request(app).post('/api/auth/login').send({ email: body.email, password: 'nope12345' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'x@y.com', password: 'nope12345' });
    expect(wrongPass.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPass.body.message).toBe(unknown.body.message);
  });

  test('/me requires a session and returns the current user', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);

    const { agent, user } = await loginAs('partner');
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(String(user._id));
    expect(res.body.data.role).toBe('partner');
  });

  test('logout clears the cookie', async () => {
    const { agent } = await loginAs();
    await agent.post('/api/auth/logout').expect(200);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
});
