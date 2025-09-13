import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { subscriptionId } = await req.json();

    const cancelled = await razorpay.subscriptions.cancel(subscriptionId);

    return NextResponse.json({ success: true, data: cancelled });
  } catch (error: any) {
    console.error("❌ Cancel subscription error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
