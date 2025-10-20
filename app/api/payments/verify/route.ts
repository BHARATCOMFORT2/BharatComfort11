import { NextResponse } from "next/server";
import { verifyPayment } from "@/lib/payments-razorpay";
import { db } from "@/lib/firebase"; // Works fine if you already configured Firebase client SDK
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * ✅ Verify Razorpay payment and store confirmed booking in Firestore
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

    // ------------------------------------------------
    // 1️⃣ Validate request
    // ------------------------------------------------
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !listingId ||
      !totalPrice
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required payment fields" },
        { status: 400 }
      );
    }

    // ------------------------------------------------
    // 2️⃣ Ensure Razorpay secret key is available
    // ------------------------------------------------
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error("❌ Missing RAZORPAY_KEY_SECRET in environment.");
      return NextResponse.json(
        { success: false, error: "Payment verification keys not set on server." },
        { status: 500 }
      );
    }

    // ------------------------------------------------
    // 3️⃣ Verify Razorpay signature
    // ------------------------------------------------
    const isValid = verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      console.error("❌ Razorpay payment signature mismatch.");
      return NextResponse.json(
        { success: false, error: "Invalid Razorpay signature" },
        { status: 400 }
      );
    }

    // ------------------------------------------------
    // 4️⃣ Create confirmed booking record
    // ------------------------------------------------
    const booking = {
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

    await addDoc(collection(db, "bookings"), booking);

    // ------------------------------------------------
    // 5️⃣ Return success response
    // ------------------------------------------------
    return NextResponse.json({
      success: true,
      message: "✅ Payment verified successfully & booking confirmed.",
    });
  } catch (err: any) {
    console.error("🔥 Error in Razorpay verification route:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
