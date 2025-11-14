export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/* --------------------------------------------------------
   INIT
-------------------------------------------------------- */
const { adminDb } = getFirebaseAdmin();

/* --------------------------------------------------------
   WEBHOOK HANDLER
-------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret) {
      console.error("❌ Missing RAZORPAY_WEBHOOK_SECRET");
      return NextResponse.json(
        { ok: false, error: "Webhook not configured" },
        { status: 500 }
      );
    }

    /* --------------------------------------------------------
       1️⃣ Verify Signature
    -------------------------------------------------------- */
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (expected !== signature) {
      console.warn("⚠️ Invalid Razorpay signature");
      return NextResponse.json({ ok: false, error: "Invalid signature" });
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id;
    const eventType = event.event;

    /* --------------------------------------------------------
       2️⃣ Idempotency Check — Prevent Duplicate Processing
    -------------------------------------------------------- */
    const eventRef = adminDb.collection("webhook_events").doc(eventId);
    const existing = await eventRef.get();

    if (existing.exists) {
      console.log(`⚠️ Duplicate webhook skipped: ${eventId}`);
      return NextResponse.json({ ok: true, duplicate: true });
    }

    await eventRef.set({
      eventId,
      eventType,
      receivedAt: new Date(),
      processed: false,
    });

    console.log(`🚀 Webhook Event Received: ${eventType}`);

    /* --------------------------------------------------------
       3️⃣ Handle Razorpay Events
    -------------------------------------------------------- */
    switch (eventType) {
      /* --------------------------------------------------------
         💰 PAYMENT CAPTURED
      -------------------------------------------------------- */
      case "payment.captured": {
        const payment = event.payload.payment.entity;

        const paymentId = payment.id;
        const orderId = payment.order_id;
        const amount = payment.amount / 100;
        const notes = payment.notes || {};
        const bookingId = notes.bookingId;

        if (!bookingId) {
          console.warn("⚠️ Missing bookingId in payment notes");
          break;
        }

        console.log("💰 Payment captured for booking:", bookingId);

        /* Update payment */
        await adminDb.collection("payments").doc(orderId).set(
          {
            paymentId,
            orderId,
            amount,
            currency: "INR",
            status: "captured",
            verifiedVia: "webhook",
            updatedAt: new Date(),
          },
          { merge: true }
        );

        /* Update booking */
        await adminDb.collection("bookings").doc(bookingId).set(
          {
            paymentStatus: "paid",
            status: "confirmed",
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            updatedAt: new Date(),
          },
          { merge: true }
        );

        break;
      }

      /* --------------------------------------------------------
         ❌ PAYMENT FAILED
      -------------------------------------------------------- */
      case "payment.failed": {
        const payment = event.payload.payment.entity;
        const orderId = payment.order_id;
        const notes = payment.notes || {};
        const bookingId = notes.bookingId;

        if (!bookingId) break;

        await adminDb.collection("bookings").doc(bookingId).set(
          {
            paymentStatus: "failed",
            status: "payment_failed",
            failureReason: payment.error_description || "Unknown",
            updatedAt: new Date(),
          },
          { merge: true }
        );

        await adminDb.collection("payments").doc(orderId).set(
          {
            status: "failed",
            errorDescription: payment.error_description || "Unknown",
            updatedAt: new Date(),
          },
          { merge: true }
        );

        break;
      }

      /* --------------------------------------------------------
         💸 REFUND PROCESSED
      -------------------------------------------------------- */
      case "refund.processed": {
        const refund = event.payload.refund.entity;
        const refundId = refund.id;
        const paymentId = refund.payment_id;
        const amount = refund.amount / 100;

        // Find booking with this paymentId
        const bookingSnap = await adminDb
          .collection("bookings")
          .where("razorpayPaymentId", "==", paymentId)
          .get();

        for (const doc of bookingSnap.docs) {
          await doc.ref.set(
            {
              refundStatus: "processed",
              refundId,
              refundAmount: amount,
              updatedAt: new Date(),
            },
            { merge: true }
          );
        }

        await adminDb.collection("refunds").doc(refundId).set(
          {
            refundId,
            paymentId,
            amount,
            status: "processed",
            updatedAt: new Date(),
          },
          { merge: true }
        );

        break;
      }

      /* --------------------------------------------------------
         DEFAULT
      -------------------------------------------------------- */
      default:
        console.log("ℹ️ Unhandled webhook event:", eventType);
        break;
    }

    /* --------------------------------------------------------
       4️⃣ Mark processed
    -------------------------------------------------------- */
    await eventRef.update({
      processed: true,
      processedAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("🔥 Webhook error:", error);
    return NextResponse.json({ ok: false, error: "Server Error" });
  }
}
