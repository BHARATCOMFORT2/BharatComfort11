import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/webhooks";
import { admin, adminDb } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET as string;

    const isValid = verifyWebhookSignature(body, signature, secret);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);

    switch (event.event) {
      case "payment.captured": {
        const payment = event.payload.payment.entity;
        await adminDb.collection("payments").doc(payment.id).set(payment, { merge: true });
        break;
      }
      case "payment.failed": {
        console.warn("❌ Payment failed:", event.payload.payment.entity);
        break;
      }
      default:
        console.log("Unhandled event:", event.event);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
