// app/api/cancel-subscription/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { cancelSubscription } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  const { adminDb } = getFirebaseAdmin();
  const { subscriptionId } = await req.json();

  try {
    const subscription = await cancelSubscription(subscriptionId);

    await adminDb.collection("subscriptions").doc(subscriptionId).update({
      status: subscription.status,
      canceledAt: new Date(),
    });

    return NextResponse.json({ success: true, subscription }, { status: 200 });
  } catch (error: any) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
