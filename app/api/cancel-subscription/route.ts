import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { subscriptionId } = await req.json();
    const response = await razorpay.subscriptions.cancel(subscriptionId);
    return NextResponse.json({ success: true, data: response });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
