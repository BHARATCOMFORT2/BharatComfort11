import { NextResponse } from "next/server";
import { getRazorpayServerInstance } from "@/lib/payments-razorpay"; // ✅ runtime instance
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { amount, listingId, userId } = await req.json();

    // ✅ Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    // ✅ Step 1: Create Razorpay instance at runtime
    const razorpay = getRazorpayServerInstance();

    // ✅ Step 2: Create order with Razorpay
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // convert to paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    // ✅ Step 3: Store pending payment record in Firestore
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

    // ✅ Step 4: Return order to frontend
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
