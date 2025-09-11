import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sendNotification } from "@/lib/notifications"; // our helper

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

// Webhook secret from Stripe dashboard
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error("❌ Webhook verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("✅ Payment successful:", session.id);

      // Example: send notification to user
      if (session.metadata?.userId) {
        await sendNotification({
          userId: session.metadata.userId,
          type: "booking",
          message: "✅ Your payment was successful! Booking confirmed.",
          link: "/user/bookings",
        });
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log("❌ Payment failed:", paymentIntent.id);

      if (paymentIntent.metadata?.userId) {
        await sendNotification({
          userId: paymentIntent.metadata.userId,
          type: "booking",
          message: "❌ Your payment failed. Please try again.",
          link: "/payments/checkout",
        });
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
