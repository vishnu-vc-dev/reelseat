const { app, request, loginAs } = require('./helpers');
const { hoursFromNow, seedMovieAndTheatre } = require('./fixtures');
const Show = require('../src/models/Show');
const Booking = require('../src/models/Booking');
const SeatHold = require('../src/models/SeatHold');
const { DEFAULT_LAYOUT } = require('../src/utils/seats');
const { confirmBooking } = require('../src/services/booking.service');
const { verifyTicket } = require('../src/services/ticket.service');

/**
 * Payment tests run in the service's mock mode (no Razorpay keys in the
 * test environment). Mock orders are accepted only with the fixed mock
 * signature, which keeps the verification path exercised.
 */
describe('Checkout and payments', () => {
  let show;

  beforeEach(async () => {
    const { user: owner } = await loginAs('partner');
    const { movie, theatre } = await seedMovieAndTheatre(owner);
    show = await Show.create({
      movie: movie._id,
      theatre: theatre._id,
      startTime: hoursFromNow(24),
      endTime: hoursFromNow(27),
      language: 'English',
      seatLayout: DEFAULT_LAYOUT,
    });
  });

  async function holdAndOrder(agent, seats) {
    await agent.post(`/api/shows/${show._id}/hold`).send({ seats }).expect(200);
    return agent.post('/api/payments/order').send({ showId: String(show._id), seats });
  }

  test('creates an order with a server-computed total including convenience fee', async () => {
    const { agent } = await loginAs('user');
    const res = await holdAndOrder(agent, ['A1', 'C1']);

    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe(450 + 250 + 2 * 25);
    expect(res.body.data.order.amount).toBe((450 + 250 + 50) * 100);
    expect(res.body.data.mock).toBe(true);

    const booking = await Booking.findById(res.body.data.bookingId);
    expect(booking.status).toBe('PENDING');
  });

  test('cannot open checkout without an active hold', async () => {
    const { agent } = await loginAs('user');
    const res = await agent.post('/api/payments/order').send({ showId: String(show._id), seats: ['A1'] });
    expect(res.status).toBe(409);
  });

  test('verifies payment, books seats, clears holds and issues a signed ticket', async () => {
    const { agent } = await loginAs('user');
    const { body } = await holdAndOrder(agent, ['B1', 'B2']);

    const res = await agent.post('/api/payments/verify').send({
      orderId: body.data.order.id,
      paymentId: 'pay_mock_123',
      signature: 'mock_signature',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CONFIRMED');
    expect(res.body.data.ticketCode).toMatch(/^BMS-[A-F0-9]{8}$/);
    expect((await Show.findById(show._id)).bookedSeats).toEqual(['B1', 'B2']);
    expect(await SeatHold.countDocuments()).toBe(0);

    const ticket = await agent.get(`/api/bookings/${res.body.data._id}`);
    expect(ticket.body.data.qrCode).toMatch(/^data:image\/png;base64,/);
    expect((await agent.get('/api/bookings/me')).body.data).toHaveLength(1);
  });

  test('rejects a forged signature and marks the booking failed', async () => {
    const { agent } = await loginAs('user');
    const { body } = await holdAndOrder(agent, ['B3']);
    const res = await agent
      .post('/api/payments/verify')
      .send({ orderId: body.data.order.id, paymentId: 'pay_x', signature: 'forged' });
    expect(res.status).toBe(400);
    expect((await Booking.findById(body.data.bookingId)).status).toBe('FAILED');
  });

  test('another customer cannot verify my order', async () => {
    const { agent } = await loginAs('user');
    const { body } = await holdAndOrder(agent, ['B4']);
    const { agent: thief } = await loginAs('user');
    const res = await thief
      .post('/api/payments/verify')
      .send({ orderId: body.data.order.id, paymentId: 'pay_mock_1', signature: 'mock_signature' });
    expect(res.status).toBe(404);
  });

  test('confirmation is idempotent (browser callback + webhook)', async () => {
    const { agent } = await loginAs('user');
    const { body } = await holdAndOrder(agent, ['C2']);
    const input = { orderId: body.data.order.id, paymentId: 'pay_mock_9' };

    const [a, b] = await Promise.all([confirmBooking(input), confirmBooking(input)]);
    expect(String(a._id)).toBe(String(b._id));
    expect((await Show.findById(show._id)).bookedSeats).toEqual(['C2']);
  });

  test('if seats are sold before payment completes, the customer is refunded', async () => {
    const { agent } = await loginAs('user');
    const { body } = await holdAndOrder(agent, ['D1']);
    await Show.updateOne({ _id: show._id }, { $push: { bookedSeats: 'D1' } });

    const res = await agent
      .post('/api/payments/verify')
      .send({ orderId: body.data.order.id, paymentId: 'pay_mock_2', signature: 'mock_signature' });
    expect(res.status).toBe(409);
    expect(res.body.details.status).toBe('REFUNDED');
    expect((await Show.findById(show._id)).bookedSeats).toEqual(['D1']);
  });

  test('webhook rejects requests without a valid signature', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ event: 'payment.captured' }));
    expect(res.status).toBe(400);
  });

  test('ticket QR tokens cannot be forged', async () => {
    const { agent } = await loginAs('user');
    const { body } = await holdAndOrder(agent, ['E5']);
    const booking = await confirmBooking({ orderId: body.data.order.id, paymentId: 'pay_mock_3' });

    const { signTicket } = require('../src/services/ticket.service');
    const token = signTicket(booking._id);
    expect(verifyTicket(token)).toBe(String(booking._id));
    expect(verifyTicket(`${booking._id}.deadbeefdeadbeefdeadbeef`)).toBeNull();
  });
});

describe('Razorpay webhook', () => {
  test('an authentic payment.captured event confirms the booking', async () => {
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

    const { agent } = await loginAs('user');
    await agent.post(`/api/shows/${show._id}/hold`).send({ seats: ['F4'] }).expect(200);
    const { body } = await agent.post('/api/payments/order').send({ showId: String(show._id), seats: ['F4'] });

    const payload = JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_mock_webhook', order_id: body.data.order.id } } },
    });
    const { hmac } = require('../src/services/payment.service');

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', hmac('whsec_test', payload))
      .send(payload);

    expect(res.status).toBe(200);
    const booking = await Booking.findById(body.data.bookingId);
    expect(booking.status).toBe('CONFIRMED');
    expect(booking.payment.paymentId).toBe('pay_mock_webhook');
  });
});
