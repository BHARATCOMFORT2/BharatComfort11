import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sendNotification } from "@/lib/notifications";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});
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
      const { userId, bookingId } = session.metadata || {};

      console.log("✅ Payment successful for booking:", bookingId);

      if (bookingId) {
        const bookingRef = doc(db, "bookings", bookingId);
        await updateDoc(bookingRef, { status: "paid" });

        // fetch partnerId from booking document
        const bookingSnap = await getDoc(bookingRef);
        const bookingData = bookingSnap.data();
        if (bookingData?.partnerId) {
          await sendNotification({
            userId: bookingData.partnerId,
            type: "partner",
            message: `🎉 New booking received for your listing (${bookingData.listingId})!`,
            link: `/partner/bookings/${bookingId}`,
          });
        }
      }

      if (userId) {
        await sendNotification({
          userId,
          type: "booking",
          message: "✅ Your booking is confirmed!",
          link: `/user/bookings/${bookingId}`,
        });
      }

      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { userId, bookingId } = paymentIntent.metadata || {};

      console.log("❌ Payment failed for booking:", bookingId);

      if (bookingId) {
        const bookingRef = doc(db, "bookings", bookingId);
        await updateDoc(bookingRef, { status: "pending" });
      }

      if (userId) {
        await sendNotification({
          userId,
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
