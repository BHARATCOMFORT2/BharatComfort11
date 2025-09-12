// lib/webhooks.ts
import Stripe from "stripe";
import { addNotification, addDocument } from "./firestore";

if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error("⚠️ Missing Stripe environment variables");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

/**
 * Verify and construct Stripe event from webhook payload
 */
export function constructStripeEvent(
  rawBody: Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}

/**
 * Handle different webhook event types
 */
export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // ✅ Save payment record in Firestore
      await addDocument("payments", {
        sessionId: session.id,
        customerEmail: session.customer_email,
        amountTotal: session.amount_total,
        currency: session.currency,
        paymentStatus: session.payment_status,
        createdAt: new Date(),
      });

      // ✅ Notify user about successful payment
      if (session.customer_email) {
        await addNotification(
          session.customer_email,
          "🎉 Payment successful! Your booking is confirmed."
        );
      }

      console.log("✅ Checkout session recorded:", session.id);
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      // Store failed attempt for reference
      await addDocument("payments", {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: "failed",
        createdAt: new Date(),
      });

      console.error("❌ Payment failed:", paymentIntent.id);
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;

      await addDocument("refunds", {
        chargeId: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        createdAt: new Date(),
      });

      console.log("🔄 Payment refunded:", charge.id);
      break;
    }

    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;

      await addDocument("disputes", {
        disputeId: dispute.id,
        amount: dispute.amount,
        currency: dispute.currency,
        status: dispute.status,
        createdAt: new Date(),
      });

      console.warn("⚠️ Dispute created:", dispute.id);
      break;
    }

    default: {
      console.log(`Unhandled event type: ${event.type}`);
    }
  }
}
