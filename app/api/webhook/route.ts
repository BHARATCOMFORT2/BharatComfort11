import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/webhooks";
import { db } from "@/lib/firebase"; // Firestore client
import { addNotification } from "@/lib/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET as string;
    const isValid = verifyWebhookSignature(body, signature, webhookSecret);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    const payment =
      event.payload?.payment?.entity || event.payload?.invoice?.entity;

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

          // ✅ Save to Firestore
          await db.collection("payments").doc(payment.id).set(paymentData, { merge: true });

          // ✅ Update user balance if userId is available
          if (paymentData.userId) {
            const userRef = db.collection("users").doc(paymentData.userId);

            await db.runTransaction(async (t) => {
              const userDoc = await t.get(userRef);
              const currentBalance = userDoc.exists ? userDoc.data()?.balance || 0 : 0;
              const newBalance = currentBalance + paymentData.amount / 100; // Razorpay uses paise → convert to INR

              t.set(userRef, { balance: newBalance }, { merge: true });
            });

            console.log(`💰 User ${paymentData.userId} credited: +${paymentData.amount / 100}`);
          }

          // ✅ Send notification
          await addNotification("Payment captured", payment.id);

          console.log("✅ Payment saved & notification sent:", paymentData);
        }
        break;
      }

      case "payment.failed": {
        if (payment) {
          await addNotification("Payment failed", payment.id);
          console.warn("❌ Payment failed:", payment.id);
        }
        break;
      }

      case "subscription.charged": {
        await addNotification("Subscription renewed", event.payload.subscription.entity.id);
        console.log("🔄 Subscription renewed:", event.payload.subscription.entity.id);
        break;
      }

      default:
        console.log("ℹ️ Unhandled event:", event.event);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
