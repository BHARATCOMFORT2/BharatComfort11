import { NextResponse } from "next/server";
import { razorpay } from "@/lib/payments-razorpay"; // ✅ unified import
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const { planId, userId, plan, subscriptionId } = await req.json();

    if (!planId && !plan) {
      throw new Error("Plan ID or plan name is required to upgrade subscription.");
    }

    if (!razorpay) {
      throw new Error("Razorpay client not initialized.");
    }

    // ✅ Step 1: Create subscription on Razorpay
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId || process.env.DEFAULT_RAZORPAY_PLAN_ID!,
      total_count: 12, // 12 billing cycles
      customer_notify: 1,
    });

    // ✅ Step 2: Save subscription details in Firestore
    const subRef = doc(db, "subscriptions", subscription.id);
    await setDoc(subRef, {
      userId: userId ?? "guest",
      plan: plan ?? "standard",
      subscriptionId: subscriptionId ?? subscription.id,
      razorpaySubscriptionId: subscription.id,
      status: subscription.status ?? "created",
      total_count: subscription.total_count,
      plan_id: subscription.plan_id,
      createdAt: serverTimestamp(),
    });

    // ✅ Step 3: Return subscription details
    return NextResponse.json({
      success: true,
      message: "Subscription created successfully.",
      razorpaySubscriptionId: subscription.id,
      status: subscription.status,
      amount: subscription.plan?.item?.amount / 100 || null, // optional
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("❌ Upgrade Subscription API error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
