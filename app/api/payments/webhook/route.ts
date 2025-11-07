// app/api/payments/webhook/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseadmin";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

/**
 * 🔐 Razorpay Webhook Handler
 * Receives POST requests from Razorpay when a payment or refund occurs.
 *
 * Add this URL in Razorpay Dashboard:
 * https://<your-domain>/api/payments/webhook
 */

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret)
      return NextResponse.json(
        { success: false, error: "Webhook secret not configured" },
        { status: 500 }
      );

    // Verify Razorpay signature
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(bodyText)
      .digest("hex");

    if (expected !== signature) {
      console.warn("❌ Invalid Razorpay webhook signature");
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(bodyText);

    const eventType = event?.event || "unknown";
    const paymentEntity = event?.payload?.payment?.entity;
    const orderEntity = event?.payload?.order?.entity;

    console.log(`⚡ Razorpay Event: ${eventType}`);

    // === Handle payment captured ===
    if (eventType === "payment.captured") {
      const { id, order_id, amount, email, notes } = paymentEntity;
      const bookingId = notes?.bookingId || order_id;

      if (bookingId) {
        const bookingRef = db.collection("bookings").doc(bookingId);
        await bookingRef.set(
          {
            paymentStatus: "paid",
            paymentId: id,
            paymentAmount: amount / 100,
            updatedAt: new Date(),
          },
          { merge: true }
        );

        // Optional email alert
        await sendEmail(
          email || "support@bharatcomfort11.com",
          "✅ Payment Confirmed",
          `<p>Your payment for booking <b>${bookingId}</b> has been successfully captured.</p>`
        );

        console.log(`💰 Booking ${bookingId} marked as paid`);
      }
    }

    // === Handle payment failed ===
    else if (eventType === "payment.failed") {
      const { id, order_id, error_description, notes } = paymentEntity;
      const bookingId = notes?.bookingId || order_id;
      if (bookingId) {
        const bookingRef = db.collection("bookings").doc(bookingId);
        await bookingRef.set(
          {
            paymentStatus: "failed",
            paymentId: id,
            failureReason: error_description || "Unknown",
            updatedAt: new Date(),
          },
          { merge: true }
        );
        console.warn(`⚠️ Booking ${bookingId} payment failed`);
      }
    }

    // === Handle refund processed ===
    else if (eventType === "refund.processed") {
      const { payment_id, amount } = event.payload.refund.entity;
      const snap = await db
        .collection("bookings")
        .where("paymentId", "==", payment_id)
        .get();

      for (const doc of snap.docs) {
        await doc.ref.update({
          refundStatus: "processed",
          refundAmount: amount / 100,
          updatedAt: new Date(),
        });
      }

      console.log(`💸 Refund processed for payment ${payment_id}`);
    }

    // === Unknown event ===
    else {
      console.log(`ℹ️ Unhandled Razorpay event type: ${eventType}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("🔥 Razorpay webhook error:", err);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
