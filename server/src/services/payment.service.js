const crypto = require('crypto');
const Razorpay = require('razorpay');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

/**
 * Thin wrapper around Razorpay.
 *
 * When API keys are not configured (local development, CI) the service runs
 * in an explicit mock mode so the full booking flow can be exercised without
 * a gateway account. Mock mode is refused in production unless
 * ALLOW_MOCK_PAYMENTS=true is set deliberately for a demo deployment.
 */
const hasKeys = Boolean(env.razorpay.keyId && env.razorpay.keySecret);
const mockAllowed = !env.isProd || process.env.ALLOW_MOCK_PAYMENTS === 'true';
const isMock = !hasKeys;

let client = null;
if (hasKeys) {
  client = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
}

/** HMAC-SHA256 hex digest. */
function hmac(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/** Constant-time string comparison to avoid timing attacks on signatures. */
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Creates a gateway order for the given amount.
 * @param {{ amountRupees: number, receipt: string, notes?: Record<string, string> }} input
 * @returns {Promise<{ id: string, amount: number, currency: string, provider: 'razorpay'|'mock' }>}
 */
async function createOrder({ amountRupees, receipt, notes }) {
  const amount = Math.round(amountRupees * 100);

  if (isMock) {
    if (!mockAllowed) throw new ApiError(503, 'Payments are not configured');
    return { id: `order_mock_${crypto.randomBytes(8).toString('hex')}`, amount, currency: 'INR', provider: 'mock' };
  }

  const order = await client.orders.create({ amount, currency: 'INR', receipt, notes });
  return { id: order.id, amount: order.amount, currency: order.currency, provider: 'razorpay' };
}

/**
 * Verifies the signature Razorpay Checkout returns to the browser.
 * Razorpay signs `${order_id}|${payment_id}` with the key secret, so a valid
 * signature proves the payment really happened for this order.
 * @param {{ orderId: string, paymentId: string, signature: string }} input
 */
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (orderId.startsWith('order_mock_')) {
    return isMock && mockAllowed && signature === 'mock_signature';
  }
  if (!hasKeys) return false;
  return safeEqual(hmac(env.razorpay.keySecret, `${orderId}|${paymentId}`), signature);
}

/**
 * Verifies the `X-Razorpay-Signature` header of a webhook call.
 * Must be computed over the raw request body, byte for byte.
 * @param {Buffer|string} rawBody
 * @param {string} signature
 */
function verifyWebhookSignature(rawBody, signature) {
  if (!env.razorpay.webhookSecret || !signature) return false;
  return safeEqual(hmac(env.razorpay.webhookSecret, rawBody), signature);
}

/**
 * Refunds a captured payment (used when seats were lost after payment).
 * @param {string} paymentId
 * @param {number} amountRupees
 * @returns {Promise<string|null>} refund id
 */
async function refund(paymentId, amountRupees) {
  if (isMock || paymentId.startsWith('pay_mock_')) return `rfnd_mock_${crypto.randomBytes(6).toString('hex')}`;
  const result = await client.payments.refund(paymentId, { amount: Math.round(amountRupees * 100), speed: 'normal' });
  return result.id;
}

module.exports = {
  isMock,
  keyId: env.razorpay.keyId,
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  refund,
  hmac,
};
