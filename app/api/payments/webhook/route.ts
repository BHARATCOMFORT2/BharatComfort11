export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

const { adminDb } = getFirebaseAdmin();

/* --------------------------------------------------------
PLATFORM CONFIG
-------------------------------------------------------- */

const COMMISSION_RATE = 0.06;

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
WEBHOOK HANDLER
-------------------------------------------------------- */

export async function POST(req: Request) {
try {
const rawBody = await req.text();

```
const signature = req.headers.get("x-razorpay-signature") || "";

const secret = resolveWebhookSecret();

/* --------------------------------------------------------
   VERIFY SIGNATURE
-------------------------------------------------------- */

if (!verifySignature(rawBody, signature, secret)) {
  console.warn("Invalid Razorpay webhook signature");

  return NextResponse.json(
    { ok: false, error: "Invalid signature" },
    { status: 400 }
  );
}

const event = JSON.parse(rawBody);

const eventId = event?.id;
const eventType = event?.event;

if (!eventId || !eventType) {
  return NextResponse.json(
    { ok: false, error: "Invalid webhook payload" },
    { status: 400 }
  );
}

/* --------------------------------------------------------
   IDEMPOTENCY PROTECTION
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
  receivedAt: FieldValue.serverTimestamp(),
  processed: false,
});

console.log("Webhook received:", eventType);

/* --------------------------------------------------------
   EVENT HANDLING
-------------------------------------------------------- */

switch (eventType) {
  /* =====================================================
     PAYMENT CAPTURED
  ===================================================== */

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
      console.warn("Payment intent not found:", orderId);
      break;
    }

    const paymentIntent = paySnap.data() as any;

    const bookingId = paymentIntent.bookingId;

    const bookingRef = adminDb.collection("bookings").doc(bookingId);

    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      console.warn("Booking not found:", bookingId);
      break;
    }

    const booking = bookingSnap.data();

    if (booking?.paymentStatus === "paid") {
      console.log("Booking already processed:", bookingId);
      break;
    }

    /* -------------------------------------
       Confirm booking
    ------------------------------------- */

    await bookingRef.update({
      paymentStatus: "paid",
      status: "confirmed",
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      paidAmount: amount,
      updatedAt: FieldValue.serverTimestamp(),
    });

    /* -------------------------------------
       Inventory lock
    ------------------------------------- */

    const lockSnap = await adminDb
      .collection("inventory_locks")
      .where("bookingId", "==", bookingId)
      .limit(1)
      .get();

    if (lockSnap.empty) {
      await adminDb.collection("inventory_locks").add({
        listingId: booking?.listingId,
        bookingId,
        checkIn: booking?.checkIn,
        checkOut: booking?.checkOut,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    /* -------------------------------------
       Settlement creation
    ------------------------------------- */

    if (booking?.partnerId) {

      const commission = amount * COMMISSION_RATE;

      const payoutAmount = amount - commission;

      await adminDb.collection("settlements").add({

        bookingId,

        partnerId: booking.partnerId,

        grossAmount: amount,

        commission,

        payoutAmount,

        status: "pending",

        createdAt: FieldValue.serverTimestamp(),
      });
    }

    await payRef.update({
      status: "captured",
      razorpayPaymentId: paymentId,
      verifiedVia: "webhook",
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log("Booking confirmed:", bookingId);

    break;
  }

  /* =====================================================
     PAYMENT FAILED
  ===================================================== */

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

    await adminDb.collection("bookings").doc(bookingId).update({

      paymentStatus: "failed",

      status: "payment_failed",

      updatedAt: FieldValue.serverTimestamp(),
    });

    await payRef.update({
      status: "failed",
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log("Payment failed:", bookingId);

    break;
  }

  /* =====================================================
     REFUND PROCESSED
  ===================================================== */

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

      await bookingRef.update({
        refundStatus: "processed",
        refundAmount: amount,
        refundId,
        updatedAt: FieldValue.serverTimestamp(),
      });
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
}

/* --------------------------------------------------------
   MARK WEBHOOK PROCESSED
-------------------------------------------------------- */

await eventRef.update({
  processed: true,
  processedAt: FieldValue.serverTimestamp(),
});

return NextResponse.json({ ok: true });
```

} catch (err) {

```
console.error("Webhook processing error:", err);

return NextResponse.json(
  { ok: false, error: "Webhook processing failed" },
  { status: 500 }
);
```

}
}
