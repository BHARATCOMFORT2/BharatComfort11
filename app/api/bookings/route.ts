// app/api/bookings/route.ts
import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { userId, amount, bookingDetails } = await req.json();

    if (!userId || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ✅ Check Razorpay instance before using
    if (!razorpay) {
      console.warn("⚠️ Razorpay keys missing. Skipping order creation (dev mode).");
      return NextResponse.json({
        success: false,
        message: "Razorpay not configured. Please add keys in .env.local",
      });
    }

    // ✅ Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    // ✅ Save booking in Firestore
    const docRef = await addDoc(collection(db, "bookings"), {
      userId,
      amount,
      bookingDetails,
      orderId: razorpayOrder.id,
      createdAt: Timestamp.now(),
      paymentStatus: "pending",
    });

    return NextResponse.json({
      success: true,
      order: razorpayOrder,
      bookingId: docRef.id,
    });
  } catch (error) {
    console.error("❌ Booking API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
