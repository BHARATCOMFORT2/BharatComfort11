export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { generateBookingInvoice } from "@/lib/invoices/generateBookingInvoice";
import { uploadInvoiceToFirebase } from "@/lib/storage/uploadInvoice";
import { sendInvoiceEmail } from "@/lib/emails/sendInvoiceEmail";
import { pushInvoiceNotification } from "@/lib/notifications/pushInvoiceNotification";

/* --------------------------------------------------------
   INITIALIZE ADMIN
-------------------------------------------------------- */
const { adminDb } = getFirebaseAdmin();

/* --------------------------------------------------------
   POST /api/payments/verify
-------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
    } = await req.json();

    /* --------------------------------------------------------
       1️⃣ Validate Inputs
    -------------------------------------------------------- */
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !bookingId
    ) {
      return NextResponse.json(
        { success: false, error: "Missing payment fields" },
        { status: 400 }
      );
    }

    /* --------------------------------------------------------
       2️⃣ Validate Signature
    -------------------------------------------------------- */
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      console.error("❌ Signature mismatch. Payment invalid.");
      return NextResponse.json(
        { success: false, error: "Invalid Razorpay signature" },
        { status: 400 }
      );
    }

    console.log("✅ Razorpay signature verified.");

    /* --------------------------------------------------------
       3️⃣ Fetch Booking
    -------------------------------------------------------- */
    const bookingRef = adminDb.collection("bookings").doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    const booking = bookingSnap.data()!;
    const userId = booking.userId;
    const partnerId = booking.partnerId;

    /* --------------------------------------------------------
       4️⃣ Idempotent check (avoid double-processing)
    -------------------------------------------------------- */
    if (booking.paymentStatus === "paid") {
      return NextResponse.json({
        success: true,
        message: "Payment already processed.",
      });
    }

    /* --------------------------------------------------------
       5️⃣ Update /payments Document
    -------------------------------------------------------- */
    const paymentRef = adminDb.collection("payments").doc(razorpay_order_id);
    await paymentRef.set(
      {
        status: "success",
        razorpayPaymentId: razorpay_payment_id,
        verifiedAt: FieldValue.serverTimestamp(),
        bookingId,
        userId,
        partnerId,
        amount: booking.amount,
      },
      { merge: true }
    );

    /* --------------------------------------------------------
       6️⃣ Mark booking as confirmed & paid
    -------------------------------------------------------- */
    await bookingRef.update({
      paymentStatus: "paid",
      status: "confirmed",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log("✅ Booking marked paid:", bookingId);

    /* --------------------------------------------------------
       7️⃣ Generate Invoice (Unified format)
    -------------------------------------------------------- */
    const invoiceId = `INV-${bookingId}-${Date.now()}`;

    const pdf = await generateBookingInvoice({
      bookingId,
      userId: booking.userId,
      paymentId: razorpay_payment_id,
      amount: booking.amount,
    });

    const invoiceUrl =
      typeof pdf === "string"
        ? pdf
        : await uploadInvoiceToFirebase(pdf, invoiceId, "booking");

    /* --------------------------------------------------------
       8️⃣ Store invoice record
    -------------------------------------------------------- */
    await adminDb.collection("invoices").add({
      type: "booking",
      bookingId,
      userId,
      partnerId,
      amount: booking.amount,
      invoiceUrl,
      paymentId: razorpay_payment_id,
      createdAt: FieldValue.serverTimestamp(),
    });

    /* --------------------------------------------------------
       9️⃣ Email user (if email exists)
    -------------------------------------------------------- */
    if (booking.userEmail) {
      await sendInvoiceEmail({
        to: booking.userEmail,
        pdfUrl: invoiceUrl,
        invoiceId,
        type: "booking",
        details: {
          name: booking.userName || "Guest",
          bookingId,
          amount: booking.amount,
          date: new Date().toLocaleDateString("en-IN"),
        },
      });
    }

    /* --------------------------------------------------------
       🔟 Push admin/partner notification
    -------------------------------------------------------- */
    await pushInvoiceNotification({
      type: "booking",
      invoiceId,
      invoiceUrl,
      userId,
      amount: booking.amount,
      relatedId: bookingId,
    });

    console.log("📄 Invoice generated & emailed:", invoiceId);

    return NextResponse.json({
      success: true,
      bookingId,
      paymentId: razorpay_payment_id,
      invoiceUrl,
      message: "Payment verified and booking confirmed.",
    });
  } catch (err: any) {
    console.error("❌ Payment verification error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
