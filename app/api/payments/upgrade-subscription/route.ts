// app/api/payments/upgrade-subscription/route.ts
import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { planId, customerId } = await req.json();

    // ✅ Create subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // example: 12 months
      customer_notify: 1,
      notes: {
        customer_id: customerId, // store it in notes instead
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error: any) {
    console.error("Subscription error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
