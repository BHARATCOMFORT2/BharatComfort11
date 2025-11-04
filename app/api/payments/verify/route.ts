import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
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
 * ✅ Verifies signature
 * ✅ Updates Firestore (payments + booking)
 * ✅ Confirms booking after success
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

    // ✅ 1️⃣ Verify Razorpay signature
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

    // ✅ 2️⃣ Fetch booking
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 }
      );
    }

    const booking = bookingSnap.data();
    if (booking.paymentStatus === "paid") {
      return NextResponse.json({
        success: true,
        message: "Booking already marked as paid.",
      });
    }

    // ✅ 3️⃣ Update /payments document
    const paymentRef = doc(db, "payments", razorpay_order_id);
    await updateDoc(paymentRef, {
      status: "success",
      razorpayPaymentId: razorpay_payment_id,
      verifiedAt: serverTimestamp(),
      bookingId,
      userId: booking.userId,
      partnerId: booking.partnerId,
      amount: booking.amount,
    }).catch((err) =>
      console.warn("⚠️ Could not update /payments doc:", err.message)
    );

    // ✅ 4️⃣ Update booking as confirmed
    await updateDoc(bookingRef, {
      paymentStatus: "paid",
      status: "confirmed",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Booking confirmed:", bookingId);

    // ✅ 5️⃣ Generate Invoice PDF
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

    // ✅ 6️⃣ Upload invoice PDF to Firebase Storage
    const invoiceUrl = await uploadInvoiceToFirebase(pdfBuffer, invoiceId, "booking");

    // ✅ 7️⃣ Save invoice link to Firestore
    await updateDoc(bookingRef, {
      invoiceId,
      invoiceUrl,
      invoiceGeneratedAt: serverTimestamp(),
    });

    // ✅ 8️⃣ Send invoice email to user
    await sendInvoiceEmail({
      to: booking.userEmail,
      subject: `Your Booking Invoice - ${invoiceId}`,
      invoiceId,
      invoiceUrl,
      bookingDetails: booking,
    });

    // ✅ 9️⃣ Push admin invoice notification
    await pushInvoiceNotification({
      type: "booking",
      invoiceId,
      invoiceUrl,
      userId: booking.userId,
      amount: booking.amount,
      relatedId: bookingId,
    });

    console.log("✅ Invoice generated & emailed:", invoiceId);

    // ✅ Final Response
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
