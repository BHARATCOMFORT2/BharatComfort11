import { NextResponse } from "next/server";
import crypto from "crypto";
import * as admin from "firebase-admin";

// ✅ Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    // ✅ Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Parse event
    const event = JSON.parse(body);

    switch (event.event) {
      case "payment.captured": {
        const payment = event.payload.payment.entity;
        const paymentData = {
          userId: payment.notes?.userId || null,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          createdAt: payment.created_at || Math.floor(Date.now() / 1000),
          paymentId: payment.id,
          orderId: payment.order_id || null,
        };

        // ✅ Save to Firestore using Admin SDK
        await db.collection("payments").doc(payment.id).set(paymentData, { merge: true });
        console.log("✅ Payment saved:", paymentData);
        break;
      }

      case "payment.failed": {
        console.warn("❌ Payment failed:", event.pay
