import { NextResponse } from "next/server";
import { getRazorpayServerInstance } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();

    if (!amount) {
      return NextResponse.json(
        { success: false, message: "Amount is required" },
        { status: 400 }
      );
    }

    const razorpay = getRazorpayServerInstance();
    if (!razorpay) {
      return NextResponse.json(
        { success: false, message: "Razorpay client not initialized" },
        { status: 500 }
      );
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return NextResponse.json({
      success: true,
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    console.error("❌ Razorpay Order API Error:", error);
    const message = error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
