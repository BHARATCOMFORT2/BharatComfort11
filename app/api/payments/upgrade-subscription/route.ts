import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { planId, customerId } = await req.json();
    
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 12, // for example 12 months
      customer_id: customerId,
    });

    return NextResponse.json({ subscriptionId: subscription.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
