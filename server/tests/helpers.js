const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

const PASSWORD = 'Passw0rd!';

/**
 * Creates a user directly in the database and returns a supertest agent that
 * already holds that user's auth cookie.
 * @param {'user'|'partner'|'admin'} role
 * @param {Partial<{ name: string, email: string }>} [overrides]
 */
async function loginAs(role = 'user', overrides = {}) {
  const email = overrides.email || `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@test.com`;
  const user = await User.create({ name: overrides.name || `Test ${role}`, email, password: PASSWORD, role });

  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);

  return { agent, user };
}

module.exports = { app, request, loginAs, PASSWORD };
