// app/api/payments/webhook/route.ts
import { NextResponse } from "next/server";
import { verifySignature } from "@/lib/payments-razorpay";
import { adminDb } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      await adminDb.collection("payments").doc(payment.id).set({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        order_id: payment.order_id,
        method: payment.method,
        email: payment.email,
        contact: payment.contact,
        created_at: new Date(payment.created_at * 1000),
      });

      console.log("💰 Payment saved to Firestore:", payment.id);
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook failed" },
      { status: 500 }
    );
  }
}
