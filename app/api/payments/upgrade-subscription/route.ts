import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { subscriptionId, plan, userId } = await req.json();

    // Here you would map `plan` to your Razorpay plan IDs
    const planMap: Record<string, string> = {
      premium: process.env.RAZORPAY_PLAN_PREMIUM!,
      basic: process.env.RAZORPAY_PLAN_BASIC!,
    };

    if (!planMap[plan]) {
      return NextResponse.json(
        { success: false, error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    // Cancel old subscription
    if (subscriptionId) {
      try {
        await razorpay.subscriptions.cancel(subscriptionId);
      } catch (err) {
        console.warn("⚠️ Unable to cancel old subscription:", err);
      }
    }

    // Create new subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planMap[plan],
      customer_notify: 1,
      total_count: 12, // 12 months
      notes: { userId },
    });

    return NextResponse.json({
      success: true,
      razorpaySubscriptionId: subscription.id,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("❌ Upgrade error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
