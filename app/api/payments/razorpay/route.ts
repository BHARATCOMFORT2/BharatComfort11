import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";


export async function POST(req: Request) {
  try {
    const { amount, currency = "INR" } = await req.json();

    if (!amount) {
      return NextResponse.json({ success: false, error: "Amount is required" }, { status: 400 });
    }

    const options = {
      amount: amount * 100, // in paise
      currency,
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    console.error("Error creating Razorpay order:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
