export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getRazorpayServerInstance } from "@/lib/payments-razorpay";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

/* --------------------------------------------------------
   INIT — ADMIN FIREBASE
-------------------------------------------------------- */
const { adminDb } = getFirebaseAdmin();

export async function POST(req: Request) {
  try {
    const { planId, userId, plan, subscriptionId } = await req.json();

    if (!planId && !plan) {
      throw new Error("Plan ID or plan name is required to upgrade subscription.");
    }

    // Use server Razorpay instance
    const razorpay = getRazorpayServerInstance();
    if (!razorpay) {
      throw new Error("Razorpay client not initialized.");
    }

    /* --------------------------------------------------------
       1️⃣ Create subscription on Razorpay
    -------------------------------------------------------- */
    const subscription = await razorpay.subscriptions.create({
      plan_id: planId || process.env.DEFAULT_RAZORPAY_PLAN_ID!,
      total_count: 12, 
      customer_notify: 1,
    });

    /* --------------------------------------------------------
       2️⃣ Save subscription to Admin Firestore
    -------------------------------------------------------- */
    await adminDb.collection("subscriptions").doc(subscription.id).set({
      userId: userId ?? "guest",
      plan: plan ?? "standard",
      subscriptionId: subscriptionId ?? subscription.id,
      razorpaySubscriptionId: subscription.id,
      status: subscription.status ?? "created",
      total_count: subscription.total_count,
      plan_id: subscription.plan_id,
      createdAt: FieldValue.serverTimestamp(),
    });

    /* --------------------------------------------------------
       3️⃣ Extract plan amount (Razorpay returns nested pricing)
    -------------------------------------------------------- */
    const planAmount =
      ((subscription as any)?.plan?.item?.amount ?? 0) / 100 || null;

    return NextResponse.json({
      success: true,
      message: "Subscription created successfully.",
      razorpaySubscriptionId: subscription.id,
      status: subscription.status,
      amount: planAmount,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("❌ Upgrade Subscription API error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
