import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { razorpay } from "@/lib/payments-razorpay";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import crypto from "crypto";

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

    // ✅ 1️⃣ Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("❌ Razorpay signature mismatch");
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 400 }
      );
    }

    console.log("✅ Razorpay signature verified for:", razorpay_payment_id);

    // ✅ 2️⃣ Fetch the booking document
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

    // ✅ 3️⃣ Update /payments collection
    const paymentRef = doc(db, "payments", razorpay_order_id);
    await updateDoc(paymentRef, {
      status: "success",
      razorpayPaymentId: razorpay_payment_id,
      verifiedAt: serverTimestamp(),
      bookingId,
      userId: booking.userId,
      partnerId: booking.partnerId,
      amount: booking.amount,
    }).catch((err) => {
      console.warn("⚠️ Could not update /payments doc:", err.message);
    });

    // ✅ 4️⃣ Update /bookings document
    await updateDoc(bookingRef, {
      paymentStatus: "paid",
      status: "confirmed",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      updatedAt: serverTimestamp(),
    });

    console.log("✅ Booking confirmed:", bookingId);

    // ✅ 5️⃣ Optional: send confirmation email
    // await sendEmail(booking.userEmail, "Booking Confirmed", `<p>Payment received...</p>`);

    return NextResponse.json({
      success: true,
      message: "Payment verified and booking confirmed successfully",
      bookingId,
      razorpay_payment_id,
    });
  } catch (error: any) {
    console.error("❌ Payment verification error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
