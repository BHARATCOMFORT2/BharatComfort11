// app/api/webhook/route.ts
import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/webhooks";
import { adminDb } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text(); // raw body for signature verification
    const signature = req.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    if (!secret) {
      console.error("Missing RAZORPAY_WEBHOOK_SECRET");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    const ok = verifyWebhookSignature(rawBody, signature, secret);
    if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

    const event = JSON.parse(rawBody);
    const payment = event.payload?.payment?.entity || event.payload?.invoice?.entity || null;

    switch (event.event) {
      case "payment.captured":
      case "invoice.paid": {
        if (payment) {
          const paymentData = {
            userId: payment.notes?.userId || null,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            createdAt: payment.created_at || Math.floor(Date.now() / 1000),
            paymentId: payment.id,
            orderId: payment.order_id || null,
            invoiceUrl: payment.invoice_url || null,
          };

          // Save payment (Admin SDK)
          await adminDb.collection("payments").doc(payment.id).set(paymentData, { merge: true });

          // Credit user balance if userId present
          if (paymentData.userId) {
            const userRef = adminDb.collection("users").doc(paymentData.userId);
            await adminDb.runTransaction(async (tx) => {
              const snap = await tx.get(userRef);
              const current = snap.exists ? (snap.data()?.balance || 0) : 0;
              const added = (paymentData.amount || 0) / 100; // paise -> INR
              tx.set(userRef, { balance: current + added }, { merge: true });
            });
          }
        }
        break;
      }

      case "payment.failed": {
        // you can log / notify here
        console.warn("Payment failed event:", event.payload?.payment?.entity);
        break;
      }

      case "subscription.charged": {
        console.log("Subscription charged:", event.payload?.subscription?.entity);
        break;
      }

      default:
        console.log("Unhandled event:", event.event);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
