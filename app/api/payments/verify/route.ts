import { NextResponse } from "next/server";
import { verifyPayment } from "@/lib/payments-razorpay"; // ✅ unified import
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

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

    // ✅ Validate input
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !listingId
    ) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ✅ Step 1 — Verify Razorpay payment signature via unified helper
    const isValid = verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      console.error("❌ Payment verification failed");
      return NextResponse.json(
        { success: false, error: "Invalid Razorpay signature" },
        { status: 400 }
      );
    }

    // ✅ Step 2 — Store verified booking in Firestore
    await addDoc(collection(db, "bookings"), {
      listingId,
      checkIn,
      checkOut,
      guests,
      totalPrice,
      userId: userId ?? "guest",
      razorpay_order_id,
      razorpay_payment_id,
      status: "confirmed",
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
