import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { planId } = await req.json();

    if (!planId) {
      throw new Error("Plan ID is required to upgrade subscription.");
    }

    if (!razorpay) {
      throw new Error("Razorpay client not initialized.");
    }

    // ✅ Create subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      total_count: 12, // example: 12 months
      customer_notify: 1,
    });

    return NextResponse.json({
      success: true,
      message: "Subscription upgraded successfully.",
      subscription,
    });
  } catch (error) {
    console.error("❌ Upgrade Subscription API error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}
