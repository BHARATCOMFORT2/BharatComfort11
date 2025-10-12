import { NextResponse } from "next/server";
import { getRazorpayInstance } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();

    if (!amount) throw new Error("Amount is required to create an order.");

    const razorpay = getRazorpayInstance();

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    const { id, currency } = order;

    return NextResponse.json({
      success: true,
      order: { id, amount, currency },
    });
  } catch (error) {
    console.error("❌ Razorpay Order API Error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
