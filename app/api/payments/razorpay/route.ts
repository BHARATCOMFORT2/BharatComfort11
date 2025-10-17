import { NextResponse } from "next/server";
import { getRazorpayServerInstance } from "@/lib/payments-razorpay"; // ✅ unified import
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { amount, userId } = await req.json();

    // ✅ Validate amount
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount is required and must be greater than 0" },
        { status: 400 }
      );
    }

    // ✅ Initialize Razorpay
    const razorpay = getRazorpayServerInstance();
    if (!razorpay) {
      return NextResponse.json(
        { success: false, error: "Razorpay client not initialized" },
        { status: 500 }
      );
    }

    // ✅ Step 1: Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: { userId: userId ?? "guest" },
    });

    // ✅ Step 2: Save raw order data in Firestore (optional but helpful for admin dashboard)
    await setDoc(doc(db, "orders", order.id), {
      userId: userId ?? "guest",
      amount,
      currency: "INR",
      status: "created",
      receipt: order.receipt,
      razorpayOrderId: order.id,
      createdAt: serverTimestamp(),
    });

    // ✅ Step 3: Return success response
    return NextResponse.json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error: any) {
    console.error("❌ Razorpay Order API Error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
