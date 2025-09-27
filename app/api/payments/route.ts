import { NextResponse } from "next/server";
import { createOrder } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { amount, currency = "INR" } = await req.json();

    const order = await createOrder(amount, currency);

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Order creation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
