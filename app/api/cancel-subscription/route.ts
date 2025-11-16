export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { subscriptionId } = await req.json();

    if (!razorpay) {
      throw new Error("Razorpay client not initialized.");
    }

    const response = await razorpay.subscriptions.cancel(subscriptionId);
    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully.",
      data: response,
    });
  } catch (error) {
    console.error("❌ Cancel Subscription API error:", error);
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
