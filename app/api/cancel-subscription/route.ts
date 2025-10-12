import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  try {
    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json({ success: false, error: "Missing subscriptionId" }, { status: 400 });
    }

    // ✅ Check Razorpay instance before using
    if (!razorpay) {
      console.warn("⚠️ Razorpay keys missing. Cannot cancel subscription (dev mode).");
      return NextResponse.json({
        success: false,
        message: "Razorpay not configured. Please add keys in .env.local",
      });
    }

    // ✅ Safely call the cancel API
    const response = await razorpay.subscriptions.cancel(subscriptionId);

    return NextResponse.json({ success: true, data: response });
  } catch (error: unknown) {
    console.error("❌ Cancel Subscription API error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({
