import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseadmin"; // ✅ Admin SDK instance
import { FieldValue } from "firebase-admin/firestore"; // ✅ Server timestamp
import crypto from "crypto";
import { generateBookingInvoice } from "@/lib/invoices/generateBookingInvoice";
import { uploadInvoiceToFirebase } from "@/lib/storage/uploadInvoice";
import { sendInvoiceEmail } from "@/lib/emails/sendInvoiceEmail";
import { pushInvoiceNotification } from "@/lib/notifications/pushInvoiceNotification";

/**
 * POST /api/payments/verify
 * Body:
 * {
 *   razorpay_order_id,
 *   razorpay_payment_id,
 *   razorpay_signature,
 *   bookingId
 * }
 *
 * ✅ Verifies Razorpay signature
 * ✅ Updates Firestore (payments + booking)
 * ✅ Confirms booking
 * ✅ Generates & emails invoice PDF
 * ✅ Pushes admin notification
 */
export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
    } = await req.json();

    // ✅ Validate inputs
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !bookingId
    ) {
      return NextResponse.json(
        { success: false, error: "Missing Razorpay fields" },
        { status: 400 }
      );
    }

    // ✅ Verify Razorpay signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("❌ Razorpay signature mismatch");
      return NextResponse.json(
        { success: false, error: "Invalid Razorpay signature" },
        { status: 400 }
      );
    }

    console.log("✅ Razorpay signature verified for:", razorpay_payment_id);

    // ✅ Fetch booking document
    const bookingRef = db.collection("bookings").doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    const booking = bookingSnap.data() || {};

    // ✅ Handle already-paid case
    if (booking.paymentStatus === "paid") {
      return NextResponse.json({
        success: true,
        message: "Booking already marked as paid.",
      });
    }

    // ✅ Update payment document
    const paymentRef = db.collection("payments").doc(razorpay_order_id);
    try {
      await paymentRef.update({
        status: "success",
        razorpayPaymentId: razorpay_payment_id,
        verifiedAt: FieldValue.serverTimestamp(),
        bookingId,
        userId: booking.userId,
        partnerId: booking.partnerId,
        amount: booking.amount,
      });
    } catch (err: any) {
      console.warn("⚠️ Could not update /payments doc:", err.message);
    }

    // ✅ Mark booking as confirmed
    await bookingRef.update({
      paymentStatus: "paid",
      status: "confirmed",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log("✅ Booking confirmed:", bookingId);

    // ✅ Generate invoice
    const invoiceId = `INV-BK-${Date.now()}`;
    const pdfBuffer = await generateBookingInvoice({
      bookingId,
      invoiceId,
      userName: booking.userName || "Guest",
      userEmail: booking.userEmail || "",
      partnerName: booking.partnerName || "",
      amount: booking.amount,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      paymentId: razorpay_payment_id,
      createdAt: new Date(),
    });

    // ✅ Upload invoice to Firebase Storage
    const invoiceUrl = await uploadInvoiceToFirebase(
      pdfBuffer,
      invoiceId,
      "booking"
    );

    // ✅ Save invoice URL in Firestore
    await bookingRef.update({
      invoiceId,
      invoiceUrl,
      invoiceGeneratedAt: FieldValue.serverTimestamp(),
    });

    // ✅ Email invoice to user
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

    // ✅ Push admin notification
    await pushInvoiceNotification({
      type: "booking",
      invoiceId,
      invoiceUrl,
      userId: booking.userId,
      amount: booking.amount,
      relatedId: bookingId,
    });

    console.log("✅ Invoice generated & emailed:", invoiceId);

    return NextResponse.json({
      success: true,
      message: "Payment verified, booking confirmed, and invoice emailed.",
      bookingId,
      razorpay_payment_id,
      invoiceUrl,
    });
  } catch (error: any) {
    console.error("❌ Payment verification + invoice error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
