// app/api/payments/webhook/route.ts
export const runtime = "nodejs"; // ✅ ensures crypto works on Netlify / Vercel

import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebaseadmin";
import { sendEmail } from "@/lib/email";

/**
 * 🔐 Razorpay Webhook Handler
 * Handles payment & refund updates securely.
 * Dashboard URL: https://bharatcomfort11.com/api/payments/webhook
 */

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("❌ Missing RAZORPAY_WEBHOOK_SECRET env");
      return NextResponse.json({ ok: false, error: "Webhook not configured" }, { status: 500 });
    }

    // ✅ Step 1: Verify HMAC signature
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(bodyText)
      .digest("hex");

    if (expected !== signature) {
      console.warn("⚠️ Invalid Razorpay webhook signature");
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(bodyText);
    const eventId = event.id;
    const eventType = event.event;
    const payload = event.payload || {};

    console.log(`⚡ Razorpay Event: ${eventType} (${eventId})`);

    // ✅ Step 2: Idempotency check — skip duplicates
    const eventRef = db.collection("webhook_events").doc(eventId);
    const exists = await eventRef.get();
    if (exists.exists) {
      console.log(`⚠️ Duplicate event ignored: ${eventId}`);
      return NextResponse.json({ ok: true, duplicate: true });
    }

    await eventRef.set({
      id: eventId,
      type: eventType,
      receivedAt: new Date(),
      processed: false,
      payload: payload,
    });

    // ✅ Step 3: Handle specific event types
    switch (eventType) {
      /* -------------------------------
         💰 PAYMENT CAPTURED
      --------------------------------*/
      case "payment.captured": {
        const payment = payload.payment?.entity;
        const { id, order_id, amount, email, notes } = payment;
        const bookingId = notes?.bookingId || order_id;

        if (bookingId) {
          await db.collection("bookings").doc(bookingId).set(
            {
              paymentId: id,
              paymentStatus: "paid",
              paymentAmount: amount / 100,
              status: "confirmed",
              updatedAt: new Date(),
            },
            { merge: true }
          );

          await db.collection("payments").doc(id).set({
            id,
            orderId: order_id,
            amount: amount / 100,
            currency: "INR",
            email,
            status: "captured",
            createdAt: new Date(),
          });

          if (email) {
            await sendEmail(
              email,
              "✅ Payment Confirmed - BharatComfort11",
              `<p>Your payment for booking <b>${bookingId}</b> was successfully captured.</p>
               <p>Amount: ₹${amount / 100}</p>`
            );
          }

          console.log(`💰 Booking ${bookingId} marked as paid`);
        }
        break;
      }

      /* -------------------------------
         ⚠️ PAYMENT FAILED
      --------------------------------*/
      case "payment.failed": {
        const payment = payload.payment?.entity;
        const { id, order_id, error_description, notes } = payment;
        const bookingId = notes?.bookingId || order_id;

        if (bookingId) {
          await db.collection("bookings").doc(bookingId).set(
            {
              paymentStatus: "failed",
              paymentId: id,
              failureReason: error_description || "Unknown",
              updatedAt: new Date(),
            },
            { merge: true }
          );

          await db.collection("payments").doc(id).set({
            id,
            orderId: order_id,
            status: "failed",
            errorDescription: error_description || "Unknown error",
            createdAt: new Date(),
          });

          console.warn(`⚠️ Booking ${bookingId} payment failed`);
        }
        break;
      }

      /* -------------------------------
         ↩️ REFUND PROCESSED
      --------------------------------*/
      case "refund.processed": {
        const refund = payload.refund?.entity;
        const { id, payment_id, amount } = refund;

        const bookingSnap = await db
          .collection("bookings")
          .where("paymentId", "==", payment_id)
          .get();

        for (const doc of bookingSnap.docs) {
          await doc.ref.update({
            refundId: id,
            refundStatus: "processed",
            refundAmount: amount / 100,
            updatedAt: new Date(),
          });
        }

        await db.collection("refunds").doc(id).set(
          {
            refundId: id,
            paymentId: payment_id,
            amount: amount / 100,
            refundStatus: "processed",
            createdAt: new Date(),
          },
          { merge: true }
        );

        console.log(`💸 Refund processed: ${id} for payment ${payment_id}`);
        break;
      }

      /* -------------------------------
         🔹 DEFAULT HANDLER
      --------------------------------*/
      default:
        console.log(`ℹ️ Unhandled Razorpay event type: ${eventType}`);
        break;
    }

    // ✅ Step 4: Mark event processed
    await eventRef.update({ processed: true, processedAt: new Date() });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("🔥 Razorpay webhook error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
