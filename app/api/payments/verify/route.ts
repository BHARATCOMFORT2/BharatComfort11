export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { wrapRoute } from "@/lib/universal-wrapper";
import crypto from "crypto";
import { generateBookingInvoice } from "@/lib/invoices/generateBookingInvoice";
import { uploadInvoiceToFirebase } from "@/lib/storage/uploadInvoice";
import { sendInvoiceEmail } from "@/lib/emails/sendInvoiceEmail";
import { pushInvoiceNotification } from "@/lib/notifications/pushInvoiceNotification";
import { FieldValue } from "firebase-admin/firestore";

/* --------------------------------------------------------
   Resolve Razorpay Secret (supports plain + base64)
-------------------------------------------------------- */
function resolveRazorpaySecret(): string {
  const plain = process.env.RAZORPAY_KEY_SECRET?.trim();
  const base64 = process.env.RAZORPAY_KEY_SECRET_BASE64?.trim();

  if (plain) return plain;
  if (base64) return Buffer.from(base64, "base64").toString("utf8");

  console.error("❌ Razorpay secret missing.");
  throw new Error("Missing Razorpay secret");
}

/* --------------------------------------------------------
   POST — Verify Razorpay Payment
-------------------------------------------------------- */
export const POST = wrapRoute(async (req, ctx) => {
  const { adminDb } = ctx;

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    bookingId,
  } = await req.json();

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
     Verify Signature
  -------------------------------------------------------- */
  const secret = resolveRazorpaySecret();

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) {
    console.error("❌ Invalid Razorpay signature");
    return NextResponse.json(
      { success: false, error: "Invalid payment signature" },
      { status: 400 }
    );
  }

  console.log("✅ Razorpay signature verified.");

  /* --------------------------------------------------------
     Fetch Booking
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

  if (booking.paymentStatus === "paid") {
    return NextResponse.json({
      success: true,
      message: "Payment already processed.",
    });
  }

  /* --------------------------------------------------------
     Update Payment Status
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

  await bookingRef.update({
    paymentStatus: "paid",
    status: "confirmed",
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log("💰 Booking marked paid:", bookingId);

  /* --------------------------------------------------------
     Generate & Upload Invoice
  -------------------------------------------------------- */
  const invoiceId = `INV-${bookingId}-${Date.now()}`;

  const pdf = await generateBookingInvoice({
    bookingId,
    userId,
    paymentId: razorpay_payment_id,
    amount: booking.amount,
  });

  const invoiceUrl =
    typeof pdf === "string"
      ? pdf
      : await uploadInvoiceToFirebase(pdf, invoiceId, "booking");

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
        paymentId: razorpay_payment_id,
      },
    });
  }

  await pushInvoiceNotification({
    type: "booking",
    invoiceId,
    invoiceUrl,
    userId,
    amount: booking.amount,
    relatedId: bookingId,
  });

  console.log("📄 Invoice generated & dispatched:", invoiceId);

  return NextResponse.json({
    success: true,
    bookingId,
    paymentId: razorpay_payment_id,
    invoiceUrl,
    message: "Payment verified successfully!",
  });
});
