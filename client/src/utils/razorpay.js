const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let loading = null;

/**
 * Loads Razorpay Checkout on demand, only when a customer actually pays,
 * so the script never slows down browsing.
 * @returns {Promise<any>} the global `Razorpay` constructor
 */
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve(window.Razorpay);
      script.onerror = () => {
        loading = null;
        reject(new Error('Could not load the payment gateway. Check your connection.'));
      };
      document.body.appendChild(script);
    });
  }
  return loading;
}

/**
 * Opens Razorpay Checkout for an order created by our server.
 * Resolves with the payment response, or rejects if the customer closes the
 * popup or the payment fails.
 *
 * @param {{ keyId: string, order: { id: string, amount: number, currency: string },
 *           prefill: { name: string, email: string }, description: string }} params
 */
export async function openRazorpayCheckout({ keyId, order, prefill, description }) {
  const Razorpay = await loadRazorpay();

  return new Promise((resolve, reject) => {
    const checkout = new Razorpay({
      key: keyId,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      name: 'ReelSeat',
      description,
      prefill,
      theme: { color: '#f84464' },
      handler: (response) =>
        resolve({
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
        }),
      modal: {
        ondismiss: () => reject(Object.assign(new Error('Payment cancelled'), { cancelled: true })),
      },
    });
    checkout.on('payment.failed', (res) =>
      reject(new Error(res.error?.description || 'Payment failed. You have not been charged.')),
    );
    checkout.open();
  });
}
