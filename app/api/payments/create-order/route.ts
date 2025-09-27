import { NextResponse } from "next/server";
import { createOrder } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();
    const order = await createOrder(amount);
    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
