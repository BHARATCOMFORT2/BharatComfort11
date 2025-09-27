import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { subscriptionId, planId } = await req.json();

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12,
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error: any) {
    console.error("Razorpay subscription error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
