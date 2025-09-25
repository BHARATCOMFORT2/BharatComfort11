import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { addNotification } from "@/lib/firestore";

// ✅ Razorpay webhook handler
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text(); // Use raw body for signature verification
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
      return NextResponse.json({ error: "Missing Razorpay signature" }, { status: 400 });
    }
    if (!webhookSecret) {
      console.error("❌ Missing RAZORPAY_WEBHOOK_SECRET in environment");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // ✅ Only parse body after signature verification
    const body = JSON.parse(rawBody);

    // ✅ Handle events
    switch (body.event) {
      case "payment.captured":
        await addNotification("Payment captured", body.payload.payment.entity.id);
        break;

      case "payment.failed":
        await addNotification("Payment failed", body.payload.paymen
