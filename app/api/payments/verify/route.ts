export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { withAuth } from "@/lib/universal-wrapper";

/* ---------------------------------------------------------
   Resolve Razorpay Secret
--------------------------------------------------------- */
function resolveRazorpaySecret(): string {
  const plain = process.env.RAZORPAY_KEY_SECRET?.trim();
  const base64 = process.env.RAZORPAY_KEY_SECRET_BASE64?.trim();

  if (plain) return plain;
  if (base64) return Buffer.from(base64, "base64").toString("utf8");

  throw new Error("Missing Razorpay secret");
}

/* ---------------------------------------------------------
   POST — Verify Razorpay Payment
--------------------------------------------------------- */
export const POST = withAuth(
  async (req, ctx) => {
    const { adminDb } = ctx;

    const body = await req.json().catch(() => ({}));

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    /* ---------------------------------------------------------
       1️⃣ Basic Validation
    --------------------------------------------------------- */
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: "Missing payment fields" },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------------
       2️⃣ Verify Razorpay Signature
    --------------------------------------------------------- */

    try {
      const secret = resolveRazorpaySecret();

      const expected = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expected !== razorpay_signature) {
        return NextResponse.json(
          { success: false, error: "Invalid Razorpay signature" },
          { status: 400 }
        );
      }
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 500 }
      );
    }

    /* ---------------------------------------------------------
       3️⃣ Fetch Payment Intent
    --------------------------------------------------------- */

    const payRef = adminDb.collection("payments").doc(razorpay_order_id);
    const paySnap = await payRef.get();

    if (!paySnap.exists) {
      return NextResponse.json(
        { success: false, error: "Payment intent not found" },
        { status: 404 }
      );
    }

    const payment = paySnap.data() as any;

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Invalid payment data" },
        { status: 500 }
      );
    }

    /* ---------------------------------------------------------
       4️⃣ Idempotency Check
    --------------------------------------------------------- */

    if (payment.status === "success" && payment.bookingId) {
      return NextResponse.json({
        success: true,
        bookingId: payment.bookingId,
        message: "Payment already processed",
      });
    }

    if (payment.status !== "created") {
      return NextResponse.json(
        { success: false, error: "Payment already processed or invalid state" },
        { status: 400 }
      );
    }

    const bookingId = payment.bookingId;

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "Payment intent missing bookingId" },
        { status: 500 }
      );
    }

    /* ---------------------------------------------------------
       5️⃣ Fetch Booking
    --------------------------------------------------------- */

    const bookingRef = adminDb.collection("bookings").doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Booking not found for this payment" },
        { status: 404 }
      );
    }

    const booking = bookingSnap.data() as any;

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Invalid booking data" },
        { status: 500 }
      );
    }

    /* ---------------------------------------------------------
       6️⃣ Booking Status Validation
    --------------------------------------------------------- */

    if (booking.status !== "pending_payment") {
      return NextResponse.json(
        { success: false, error: "Booking not awaiting payment" },
        { status: 400 }
      );
    }

    const now = FieldValue.serverTimestamp();

    /* ---------------------------------------------------------
       7️⃣ Update Booking
    --------------------------------------------------------- */

    await bookingRef.update({
      paymentStatus: "paid",
      status: "confirmed",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      updatedAt: now,
    });

    /* ---------------------------------------------------------
       8️⃣ Update Payment Intent
    --------------------------------------------------------- */

    await payRef.set(
      {
        status: "success",
        razorpayPaymentId: razorpay_payment_id,
        verifiedAt: now,
      },
      { merge: true }
    );

    /* ---------------------------------------------------------
       9️⃣ Generate Invoice (Fail Safe)
    --------------------------------------------------------- */

    let invoiceUrl: string | null = null;

    try {
      const { generateBookingInvoice } = await import(
        "@/lib/invoices/generateBookingInvoice"
      );

      const { uploadInvoiceToFirebase } = await import(
        "@/lib/storage/uploadInvoice"
      );

      const pdf = await generateBookingInvoice({
        bookingId,
        userId: payment.userId,
        paymentId: razorpay_payment_id,
        amount: payment.amount,
      });

      invoiceUrl =
        typeof pdf === "string"
          ? pdf
          : await uploadInvoiceToFirebase(
              pdf,
              `INV-${bookingId}`,
              "booking"
            );

      await adminDb.collection("invoices").add({
        type: "booking",
        bookingId,
        userId: payment.userId,
        partnerId: payment.partnerId,
        amount: payment.amount,
        invoiceUrl,
        paymentId: razorpay_payment_id,
        createdAt: now,
      });
    } catch (err) {
      console.warn("Invoice generation failed:", err);
    }

    /* ---------------------------------------------------------
       🔟 Response
    --------------------------------------------------------- */

    return NextResponse.json({
      success: true,
      bookingId,
      paymentId: razorpay_payment_id,
      invoiceUrl,
      message: "Payment verified & booking confirmed",
    });
  },

  // Allow Razorpay webhook or frontend callback
  { allowGuest: true }
);
