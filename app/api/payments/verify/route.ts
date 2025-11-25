// app/api/payments/verify/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/universal-wrapper"; 
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";

/* ------------------ Resolve Razorpay Secret ------------------ */
function resolveRazorpaySecret(): string {
  const plain = process.env.RAZORPAY_KEY_SECRET?.trim();
  const base64 = process.env.RAZORPAY_KEY_SECRET_BASE64?.trim();

  if (plain) return plain;
  if (base64) return Buffer.from(base64, "base64").toString("utf8");

  throw new Error("Missing Razorpay secret");
}

/* -------------------------------------------------------------
   POST: Verify Payment Signature + Create Booking
------------------------------------------------------------- */
export const POST = withAuth(
  async (req, ctx) => {
    const { adminDb, decoded } = ctx;

    const body = await req.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: "Missing payment fields" },
        { status: 400 }
      );
    }

    /* ------------------ Signature Verification ------------------ */
    try {
      const secret = resolveRazorpaySecret();
      const actual = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (actual !== razorpay_signature) {
        return NextResponse.json(
          { success: false, error: "Invalid Razorpay signature" },
          { status: 400 }
        );
      }
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: e.message },
        { status: 500 }
      );
    }

    /* ------------------ Fetch Payment Intent ------------------ */
    const payRef = adminDb.collection("payments").doc(razorpay_order_id);
    const paySnap = await payRef.get();

    if (!paySnap.exists) {
      return NextResponse.json(
        { success: false, error: "Payment intent not found" },
        { status: 404 }
      );
    }

    const payment = paySnap.data();

    // Already processed
    if (payment.status === "success" && payment.bookingId) {
      return NextResponse.json({
        success: true,
        message: "Payment already processed",
        bookingId: payment.bookingId,
      });
    }

    /* ------------------ Create Booking ------------------ */
    try {
      const now = FieldValue.serverTimestamp();

      const bookingData = {
        userId: payment.userId,
        userEmail: payment.userEmail || decoded?.email || null,
        partnerId: payment.partnerId,
        listingId: payment.listingId,
        amount: payment.amount,
        checkIn: payment.checkIn,
        checkOut: payment.checkOut,
        paymentMode: "razorpay",
        paymentStatus: "paid",
        status: "confirmed",
        refundStatus: "none",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        createdAt: now,
        updatedAt: now,
      };

      const bookingRef = await adminDb.collection("bookings").add(bookingData);
      const bookingId = bookingRef.id;

      /* Update payment doc */
      await payRef.set(
        {
          status: "success",
          bookingId,
          razorpayPaymentId: razorpay_payment_id,
          verifiedAt: now,
        },
        { merge: true }
      );

      /* ------------------ Generate Invoice (Best-effort) ------------------ */
      let invoiceUrl = null;
      try {
        const { generateBookingInvoice } = await import("@/lib/invoices/generateBookingInvoice");
        const { uploadInvoiceToFirebase } = await import("@/lib/storage/uploadInvoice");

        const pdf = await generateBookingInvoice({
          bookingId,
          userId: payment.userId,
          paymentId: razorpay_payment_id,
          amount: payment.amount,
        });

        invoiceUrl =
          typeof pdf === "string"
            ? pdf
            : await uploadInvoiceToFirebase(pdf, `INV-${bookingId}`, "booking");

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
      } catch (e) {
        console.warn("Invoice generation failed:", e);
      }

      return NextResponse.json({
        success: true,
        bookingId,
        paymentId: razorpay_payment_id,
        invoiceUrl,
        message: "Payment verified and booking created",
      });
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: e.message || "Booking creation failed" },
        { status: 500 }
      );
    }
  },

  // ⚠️ No login required — Razorpay signature is enough
  { allowGuest: true }
);
