import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { razorpay } from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  const { adminDb } = getFirebaseAdmin();

  try {
    const { subscriptionId } = await req.json();

    const response = await razorpay.subscriptions.cancel(subscriptionId);

    await adminDb.collection("subscriptions").doc(subscriptionId).update({
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
