const { app, request, loginAs } = require('./helpers');
const { hoursFromNow, seedMovieAndTheatre } = require('./fixtures');
const User = require('../src/models/User');
const Show = require('../src/models/Show');
const Booking = require('../src/models/Booking');
const { outbox } = require('../src/services/email.service');
const { DEFAULT_LAYOUT } = require('../src/utils/seats');

/** Reads the most recent OTP mailed to an address from the dev/test outbox. */
const latestOtp = (email) => {
  const mail = [...outbox].reverse().find((m) => m.to === email);
  return mail?.text.match(/\b(\d{6})\b/)[1];
};

/** Waits for fire-and-forget side effects (ticket email) to settle. */
const { settleSideEffects } = require('../src/services/booking.service');
const flush = () => settleSideEffects();

describe('Password reset', () => {
  beforeEach(() => outbox.splice(0));

  test('full OTP flow resets the password', async () => {
    const { user } = await loginAs('user', { email: 'reset@test.com' });

    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'reset@test.com' });
    expect(res.status).toBe(200);

    const otp = latestOtp('reset@test.com');
    expect(otp).toMatch(/^\d{6}$/);

    const stored = await User.findById(user._id).select('+resetOtpHash');
    expect(stored.resetOtpHash).not.toContain(otp);

    await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'reset@test.com', otp, password: 'brandNew123' })
      .expect(200);

    await request(app).post('/api/auth/login').send({ email: 'reset@test.com', password: 'brandNew123' }).expect(200);

    /** The code is single use. */
    const reuse = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'reset@test.com', otp, password: 'another123' });
    expect(reuse.status).toBe(400);
  });

  test('does not reveal whether an email is registered', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'ghost@test.com' });
    expect(res.status).toBe(200);
    expect(outbox).toHaveLength(0);
  });

  test('burns the code after too many wrong attempts', async () => {
    await loginAs('user', { email: 'brute@test.com' });
    await request(app).post('/api/auth/forgot-password').send({ email: 'brute@test.com' });
    const otp = latestOtp('brute@test.com');
    const wrong = otp === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/api/auth/reset-password')
        .send({ email: 'brute@test.com', otp: wrong, password: 'brandNew123' });
    }
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'brute@test.com', otp, password: 'brandNew123' });
    expect(res.status).toBe(400);
  });

  test('logged-in users can change their password', async () => {
    const { agent } = await loginAs('user', { email: 'change@test.com' });
    expect(
      (await agent.patch('/api/auth/password').send({ currentPassword: 'wrong', newPassword: 'newPass123' })).status,
    ).toBe(400);
    await agent.patch('/api/auth/password').send({ currentPassword: 'Passw0rd!', newPassword: 'newPass123' }).expect(200);
    await request(app).post('/api/auth/login').send({ email: 'change@test.com', password: 'newPass123' }).expect(200);
  });
});

describe('Ticket email', () => {
  beforeEach(() => outbox.splice(0));

  test('a confirmed booking emails the ticket with a QR attachment', async () => {
    const { user: owner } = await loginAs('partner');
    const { movie, theatre } = await seedMovieAndTheatre(owner);
    const show = await Show.create({
      movie: movie._id,
      theatre: theatre._id,
      startTime: hoursFromNow(24),
      endTime: hoursFromNow(27),
      language: 'English',
      seatLayout: DEFAULT_LAYOUT,
    });

    const { agent, user } = await loginAs('user', { email: 'fan@test.com' });
    await agent.post(`/api/shows/${show._id}/hold`).send({ seats: ['A5'] }).expect(200);
    const { body } = await agent.post('/api/payments/order').send({ showId: String(show._id), seats: ['A5'] });
    await agent
      .post('/api/payments/verify')
      .send({ orderId: body.data.order.id, paymentId: 'pay_mock_mail', signature: 'mock_signature' })
      .expect(200);

    await flush();
    const mail = outbox.find((m) => m.to === user.email);
    expect(mail.subject).toMatch(/Booking confirmed: Interstellar Drift/);
    expect(mail.attachments[0].name).toMatch(/^RS-.+\.png$/);
    expect((await Booking.findById(body.data.bookingId)).emailSentAt).toBeInstanceOf(Date);
  });
});
