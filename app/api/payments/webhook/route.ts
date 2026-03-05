export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

const { adminDb } = getFirebaseAdmin();

/* --------------------------------------------------------
   Resolve Razorpay Webhook Secret
-------------------------------------------------------- */
function resolveWebhookSecret(): string {
  const plain = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  const base64 = process.env.RAZORPAY_WEBHOOK_SECRET_BASE64?.trim();

  if (plain) return plain;
  if (base64) return Buffer.from(base64, "base64").toString("utf8");

  throw new Error("Missing Razorpay webhook secret");
}

/* --------------------------------------------------------
   Verify Razorpay Signature
-------------------------------------------------------- */
function verifySignature(rawBody: string, signature: string, secret: string) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return expected === signature;
}

/* --------------------------------------------------------
   Webhook Handler
-------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const secret = resolveWebhookSecret();

    /* --------------------------------------------------------
       1️⃣ Verify Signature
    -------------------------------------------------------- */

    if (!verifySignature(rawBody, signature, secret)) {
      console.warn("⚠ Invalid Razorpay webhook signature");

      return NextResponse.json(
        { ok: false, error: "Invalid signature" },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody);
    const eventId = event?.id;
    const eventType = event?.event;

    if (!eventId || !eventType) {
      console.warn("Invalid webhook payload");
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    /* --------------------------------------------------------
       2️⃣ Idempotency Protection
    -------------------------------------------------------- */

    const eventRef = adminDb.collection("webhook_events").doc(eventId);
    const existing = await eventRef.get();

    if (existing.exists) {
      console.log("Duplicate webhook skipped:", eventId);
      return NextResponse.json({ ok: true, duplicate: true });
    }

    await eventRef.set({
      eventId,
      eventType,
      payload: event,
      receivedAt: FieldValue.serverTimestamp(),
      processed: false,
    });

    console.log("Webhook received:", eventType);

    /* --------------------------------------------------------
       3️⃣ Handle Events
    -------------------------------------------------------- */

    switch (eventType) {
      /* ================================
         PAYMENT CAPTURED / ORDER PAID
      ================================= */

      case "payment.captured":
      case "order.paid": {
        const payment = event?.payload?.payment?.entity;

        if (!payment) break;

        const paymentId = payment.id;
        const orderId = payment.order_id;
        const amount = payment.amount / 100;

        const payRef = adminDb.collection("payments").doc(orderId);
        const paySnap = await payRef.get();

        if (!paySnap.exists) {
          console.warn("Payment intent missing:", orderId);
          break;
        }

        const paymentIntent = paySnap.data() as any;
        const bookingId = paymentIntent?.bookingId;
        const expectedAmount = paymentIntent?.amount;

        if (!bookingId) {
          console.warn("Missing bookingId in payment intent");
          break;
        }

        /* --------------------------------
           Verify payment amount
        -------------------------------- */

        if (expectedAmount && expectedAmount !== amount) {
          console.error("Amount mismatch:", {
            expectedAmount,
            receivedAmount: amount,
          });
          break;
        }

        const bookingRef = adminDb.collection("bookings").doc(bookingId);
        const bookingSnap = await bookingRef.get();

        if (!bookingSnap.exists) {
          console.warn("Booking not found:", bookingId);
          break;
        }

        const booking = bookingSnap.data();

        /* --------------------------------
           Prevent duplicate confirmation
        -------------------------------- */

        if (booking?.paymentStatus === "paid") {
          console.log("Booking already paid:", bookingId);
          break;
        }

        /* --------------------------------
           Confirm booking
        -------------------------------- */

        await bookingRef.set(
          {
            paymentStatus: "paid",
            status: "confirmed",
            razorpayOrderId: orderId,
            razorpayPaymentId: paymentId,
            paidAmount: amount,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        await payRef.set(
          {
            status: "captured",
            razorpayPaymentId: paymentId,
            verifiedVia: "webhook",
            amount,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        console.log("Payment captured → booking confirmed:", bookingId);

        break;
      }

      /* ================================
         PAYMENT FAILED
      ================================= */

      case "payment.failed": {
        const payment = event?.payload?.payment?.entity;
        if (!payment) break;

        const orderId = payment.order_id;

        const payRef = adminDb.collection("payments").doc(orderId);
        const paySnap = await payRef.get();

        if (!paySnap.exists) break;

        const paymentIntent = paySnap.data() as any;
        const bookingId = paymentIntent?.bookingId;

        if (!bookingId) break;

        await adminDb.collection("bookings").doc(bookingId).set(
          {
            paymentStatus: "failed",
            status: "payment_failed",
            failureReason:
              payment.error_description || "Unknown payment error",
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        await payRef.set(
          {
            status: "failed",
            errorDescription:
              payment.error_description || "Unknown payment error",
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        console.log("Payment failed:", bookingId);

        break;
      }

      /* ================================
         REFUND PROCESSED
      ================================= */

      case "refund.processed": {
        const refund = event?.payload?.refund?.entity;
        if (!refund) break;

        const refundId = refund.id;
        const paymentId = refund.payment_id;
        const amount = refund.amount / 100;

        const bookingSnap = await adminDb
          .collection("bookings")
          .where("razorpayPaymentId", "==", paymentId)
          .limit(1)
          .get();

        if (!bookingSnap.empty) {
          const bookingRef = bookingSnap.docs[0].ref;

          await bookingRef.set(
            {
              refundStatus: "processed",
              refundId,
              refundAmount: amount,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }

        await adminDb.collection("refunds").doc(refundId).set({
          refundId,
          paymentId,
          amount,
          status: "processed",
          createdAt: FieldValue.serverTimestamp(),
        });

        console.log("Refund processed:", refundId);

        break;
      }

      default:
        console.log("Unhandled Razorpay event:", eventType);
        break;
    }

    /* --------------------------------------------------------
       4️⃣ Mark Webhook Processed
    -------------------------------------------------------- */

    await eventRef.update({
      processed: true,
      processedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);

    return NextResponse.json(
      { ok: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
