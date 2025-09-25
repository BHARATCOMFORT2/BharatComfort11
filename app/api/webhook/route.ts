import { NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) return NextResponse.json({ error: "No signature" }, { status: 400 });

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });

    const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");
    if (signature !== expectedSignature) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

    const event = JSON.parse(body);
    switch (event.event) {
      case "payment.captured":
        console.log("✅ Payment captured:", event.payload.payment.entity);
        break;
      case "payment.failed":
        console.warn("❌ Payment failed:", event.payload.payment.entity);
        break;
      case "subscription.charged":
        console.log("🔄 Subscription renewed:", event.payload.subscription.entity);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
