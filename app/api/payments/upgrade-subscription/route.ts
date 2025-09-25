import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscriptionId, plan, userId } = body;

    if (!subscriptionId || !userId) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // ---- RAZORPAY LOGIC ----
    const key = process.env.RAZORPAY_KEY_ID ;
    const secret = process.env.RAZORPAY_KEY_SECRET ;

    // Normally here you would call Razorpay API to create a subscription
    // For testing, we just return a dummy subscription ID
    const razorpaySubscriptionId = `sub_dummy_${Math.floor(Math.random() * 1000000)}`;

    return NextResponse.json({
      success: true,
      razorpaySubscriptionId,
      key,
    });
  } catch (err: any) {
    console.error("Error in upgrade-subscription API:", err);
    return NextResponse.json({
      success: false,
      error: err.message || "Server error",
    }, { status: 500 });
  }
}
