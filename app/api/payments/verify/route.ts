import { NextResponse } from "next/server";
import { verifyPayment } from "@/lib/payments-razorpay";
import { adminDb } from "@/lib/firebaseadmin"; // ✅ Server-safe
import { serverTimestamp } from "firebase/firestore";

function resolveSecret() {
  const raw = process.env.RAZORPAY_KEY_SECRET?.trim();
  const encoded = process.env.RAZORPAY_KEY_SECRET_BASE64?.trim();
  if (raw) return raw;
  if (encoded) return Buffer.from(encoded, "base64").toString("utf8");
  return null;
}

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
    // 2️⃣ Ensure secret exists
    // ------------------------------------------------
    const secret = resolveSecret();
    if (!secret) {
      console.error("❌ Razorpay secret missing in environment.");
      return NextResponse.json(
        { success: false, error: "Server missing Razorpay credentials." },
        { status: 500 }
      );
    }

    console.log("🔍 Verifying Razorpay payment:", {
      order: razorpay_order_id,
      payment: razorpay_payment_id,
      hasSecret: !!secret,
    });

    // ------------------------------------------------
    // 3️⃣ Verify Razorpay signature
    // ------------------------------------------------
    const isValid = verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      console.error("❌ Razorpay signature mismatch.");
      return NextResponse.json(
        { success: false, error: "Invalid Razorpay signature" },
        { status: 400 }
      );
    }

    // ------------------------------------------------
    // 4️⃣ Create confirmed booking
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

    await adminDb.collection("bookings").add(booking);

    // ------------------------------------------------
    // 5️⃣ Success response
    // ------------------------------------------------
    return NextResponse.json({
      success: true,
      message: "✅ Payment verified & booking confirmed.",
    });
  } catch (err: any) {
    console.error("🔥 Error verifying Razorpay payment:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
