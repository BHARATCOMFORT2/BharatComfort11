// app/api/payments/route.ts
import { NextResponse } from "next/server";
import { createOrder } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();

    if (!amount) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }

    const order = await createOrder({
      amount: amount * 100, // convert to paisa
      currency: "INR",
      receipt: `receipt_${Date.now()}`
    });

    return NextResponse.json({ id: order.id, currency: order.currency, amount: order.amount });
  } catch (error) {
    console.error("Payment API Error:", error);
    return NextResponse.json({ error: "Order creation failed" }, { status: 500 });
  }
}
