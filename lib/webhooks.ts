import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { addNotification } from "@/lib/firestore";

// ✅ Razorpay webhook handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing Razorpay signature" }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(JSON.stringify(body))
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // ✅ Handle events
    switch (body.event) {
      case "payment.captured":
        await addNotification("Payment captured", body.payload.payment.entity.id);
        break;

      case "payment.failed":
        await addNotification("Payment failed", body.payload.payment.entity.id);
        break;

      case "order.paid":
        await addNotification("Order paid", body.payload.order.entity.id);
        break;

      default:
        console.log(`Unhandled event: ${body.event}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
