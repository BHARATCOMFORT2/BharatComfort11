// lib/payments.ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("⚠️ Missing STRIPE_SECRET_KEY in environment variables");
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20", // keep Stripe API version up-to-date
});

/**
 * Create a Checkout Session
 * @param customerEmail - email of the customer
 * @param lineItems - array of Stripe line items
 * @param successUrl - URL to redirect after payment success
 * @param cancelUrl - URL to redirect if payment canceled
 */
export async function createCheckoutSession(
  customerEmail: string,
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
  successUrl: string,
  cancelUrl: string
) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: customerEmail,
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
}

/**
 * Get Checkout Session by ID
 * @param sessionId - Stripe Checkout Session ID
 */
export async function getCheckoutSession(sessionId: string) {
  return stripe.checkout.sessions.retrieve(sessionId);
}

/**
 * Refund a Payment
 * @param paymentIntentId - Stripe Payment Intent ID
 */
export async function refundPayment(paymentIntentId: string) {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
  });
}

/**
 * List all payments (for admin/staff dashboards)
 */
export async function listPayments(limit = 10) {
  return stripe.paymentIntents.list({ limit });
}
