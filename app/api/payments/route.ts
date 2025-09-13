import { NextResponse } from "next/server";
import { createOrder } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const order = await createOrder(amount, "INR");
    return NextResponse.json({ orderId: order.id, amount: order.amount });
  } catch (err: any) {
    console.error("Error creating Razorpay order:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
