import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!razorpay) {
      return NextResponse.json(
        { success: false, error: "Razorpay not configured" },
        { status: 500 }
      );
    }

    const { subscriptionId } = await req.json();

    // Cancel subscription
    const canceled = await razorpay.subscriptions.cancel(subscriptionId);

    return NextResponse.json({ success: true, canceled });
  } catch (error: any) {
    console.error("❌ Cancel subscription error:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  } // ✅ closes try/catch
} // ✅ closes POST function
