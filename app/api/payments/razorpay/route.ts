import { NextResponse } from "next/server";
import { createRazorpayOrder } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { amount } = await req.json();

    if (!amount) {
      return NextResponse.json({ error: "Amount required" }, { status: 400 });
    }

    const order = await createRazorpayOrder(amount);

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
