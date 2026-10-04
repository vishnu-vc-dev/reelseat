const express = require('express');
const { app, request, loginAs } = require('./helpers');
const { createLimiter } = require('../src/middleware/security');

describe('Security hardening', () => {
  test('sets security headers and hides the Express fingerprint', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  test('NoSQL operator injection in login is neutralised', async () => {
    await loginAs('user', { email: 'victim@test.com' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  test('operator keys in query strings are stripped', async () => {
    const res = await request(app).get('/api/movies').query({ 'genre[$ne]': 'x' });
    expect(res.status).toBe(400);
  });

  test('oversized JSON bodies are rejected', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'x'.repeat(20 * 1024), email: 'a@b.com', password: 'abc12345' });
    expect(res.status).toBe(413);
  });

  test('CORS only allows the configured frontend origin with credentials', async () => {
    const ok = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(ok.headers['access-control-allow-credentials']).toBe('true');

    const evil = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('rate limiter returns 429 with standard headers once the budget is spent', async () => {
    const env = require('../src/config/env');
    const original = env.isTest;
    env.isTest = false;
    try {
      const mini = express();
      mini.get('/', createLimiter({ windowMinutes: 1, limit: 2, message: 'slow down' }), (req, res) => res.send('ok'));
      await request(mini).get('/').expect(200);
      await request(mini).get('/').expect(200);
      const blocked = await request(mini).get('/');
      expect(blocked.status).toBe(429);
      expect(blocked.body.message).toBe('slow down');
      expect(blocked.headers.ratelimit).toBeDefined();
    } finally {
      env.isTest = original;
    }
  });
});
