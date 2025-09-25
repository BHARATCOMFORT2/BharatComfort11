import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";

export const dynamic = "force-dynamic"; // 🚀

export async function POST(req: Request) {
  if (!razorpay) {
    return NextResponse.json(
      { error: "Razorpay not configured" },
      { status: 500 }
    );
 
  try {
    const { subscriptionId } = await req.json();

    const cancelled = await razorpay.subscriptions.cancel(subscriptionId);

    return NextResponse.json({ success: true, data: cancelled });
  } catch (error: any) {
    console.error("❌ Cancel subscription error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

