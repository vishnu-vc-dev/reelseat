const router = require('express').Router();

const ctrl = require('../controllers/payment.controller');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { z, objectId } = require('../validators/common');

const orderBody = z.object({
  showId: objectId,
  seats: z
    .array(
      z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{1,2}\d{1,2}$/),
    )
    .min(1)
    .max(10),
});

const verifyBody = z.object({
  orderId: z.string().min(1).max(64),
  paymentId: z.string().min(1).max(64),
  signature: z.string().min(1).max(256),
});

/**
 * The webhook route is mounted in app.js with a raw body parser, ahead of
 * express.json(), so it is intentionally absent here.
 */
router.get('/config', ctrl.config);
router.post('/order', protect, validate({ body: orderBody }), ctrl.createOrder);
router.post('/verify', protect, validate({ body: verifyBody }), ctrl.verifyPayment);
router.post('/cancel', protect, validate({ body: z.object({ orderId: z.string().min(1).max(64) }) }), ctrl.cancelPayment);

module.exports = router;
