import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();

    if (!amount) {
      throw new Error("Amount is required to create an order.");
    }

    if (!razorpay) {
      throw new Error("Razorpay client not initialized.");
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return NextResponse.json({
      success: true,
      message: "Order created successfully.",
      order,
    });
  } catch (error) {
    console.error("❌ Razorpay Order API Error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}
