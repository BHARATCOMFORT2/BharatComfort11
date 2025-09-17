import { NextResponse } from "next/server";
import { createRazorpayOrder } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { amount, currency } = await req.json();

    if (!amount) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }

    const order = await createRazorpayOrder(amount, currency || "INR");
    return NextResponse.json(order, { status: 200 });
  } catch (error: any) {
    console.error("Razorpay order error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
