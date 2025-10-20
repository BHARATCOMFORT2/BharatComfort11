import { NextResponse } from "next/server";
import { getRazorpayServerInstance } from "@/lib/payments-razorpay";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { amount, listingId, userId } = await req.json();

    // ✅ 1️⃣ Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    // ✅ 2️⃣ Initialize Razorpay
    const razorpay = getRazorpayServerInstance();
    if (!razorpay) {
      throw new Error(
        "⚠️ Razorpay not initialized. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET env vars."
      );
    }

    // ✅ 3️⃣ Create order with Razorpay
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // INR → paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    // ✅ 4️⃣ Store pending payment in Firestore
    const orderRef = doc(db, "payments", order.id);
    await setDoc(orderRef, {
      userId: userId ?? "guest",
      listingId: listingId ?? null,
      amount,
      currency: "INR",
      status: "pending",
      razorpayOrderId: order.id,
      createdAt: serverTimestamp(),
    });

    // ✅ 5️⃣ Return order details
    return NextResponse.json({
      success: true,
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err: any) {
    console.error("❌ Error creating Razorpay order:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to create Razorpay order",
      },
      { status: 500 }
    );
  }
}
