import { NextResponse } from "next/server";
import { verifyPayment } from "@/lib/payments-razorpay";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * ✅ Verify Razorpay payment and create confirmed booking
 */
export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      listingId,
      checkIn,
      checkOut,
      guests,
      totalPrice,
      userId,
    } = await req.json();

    // ----------------------------
    // 1️⃣ Validate Request Body
    // ----------------------------
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !listingId ||
      !totalPrice
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ----------------------------
    // 2️⃣ Ensure Razorpay Secret Exists
    // ----------------------------
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error("❌ Missing RAZORPAY_KEY_SECRET in environment.");
      return NextResponse.json(
        { success: false, error: "Payment verification keys not set on server." },
        { status: 500 }
      );
    }

    // ----------------------------
    // 3️⃣ Verify Payment Signature
    // ----------------------------
    const isValid = verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      console.error("❌ Razorpay payment signature verification failed.");
      return NextResponse.json(
        { success: false, error: "Invalid Razorpay signature" },
        { status: 400 }
      );
    }

    // ----------------------------
    // 4️⃣ Store Verified Booking
    // ----------------------------
    const bookingData = {
      listingId,
      userId: userId ?? "guest",
      razorpay_order_id,
      razorpay_payment_id,
      checkIn: checkIn ?? null,
      checkOut: checkOut ?? null,
      guests: guests ?? 1,
      totalPrice,
      status: "confirmed",
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "bookings"), bookingData);

    // ----------------------------
    // 5️⃣ Return Success Response
    // ----------------------------
    return NextResponse.json({
      success: true,
      message: "Payment verified and booking confirmed.",
    });
  } catch (err: any) {
    console.error("❌ Error verifying Razorpay payment:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
