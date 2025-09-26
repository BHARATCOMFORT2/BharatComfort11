import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import razorpay from "@/lib/payments-razorpay";

export async function POST(req: Request) {
  const { adminDb } = getFirebaseAdmin();

  try {
    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json({ success: false, error: "subscriptionId is required" }, { status: 400 });
    }

    await adminDb.collection("subscriptions").doc(subscriptionId).update({
      status: "cancelled",
      cancelledAt: new Date(),
    });

    return NextResponse.json({ success: true, message: "Subscription cancelled successfully" });
  } catch (err: any) {
    console.error("Error cancelling subscription:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
