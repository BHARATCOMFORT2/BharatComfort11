import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import crypto from "crypto";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const paymentWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("❌ Missing RAZORPAY_WEBHOOK_SECRET in environment");
      return res.status(500).send("Webhook secret not configured");
    }

    const signature = req.headers["x-razorpay-signature"] as string;
    if (!signature) {
      console.error("❌ Missing Razorpay signature");
      return res.status(400).send("Signature missing");
    }

    // ✅ Verify signature using rawBody (required by Razorpay)
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update((req as any).rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("❌ Invalid webhook signature");
      return res.status(400).send("Invalid signature");
    }

    const { event, payload } = req.body;
    const entity =
      payload?.payment?.entity ||
      payload?.invoice?.entity ||
      payload?.subscription?.entity ||
      null;

    if (!entity) {
      console.error("❌ No entity payload found in webhook");
      return res.status(400).send("No payload found");
    }

    console.log(`📦 Razorpay Webhook Received: ${event}`);

    // ✅ Common structure for saving payments
    const basePaymentData = {
      userId: entity.notes?.userId ?? "guest",
      amount: entity.amount ? entity.amount / 100 : null, // convert from paise to INR
      currency: entity.currency ?? "INR",
      status: entity.status,
      paymentId: entity.id ?? null,
      orderId: entity.order_id ?? null,
      invoiceId: entity.invoice_id ?? null,
      invoiceUrl: entity.invoice_url ?? null,
      planId: entity.plan_id ?? null,
      subscriptionId: entity.subscription_id ?? null,
      createdAt: admin.firestore.Timestamp.fromMillis(
        ((entity.created_at || Math.floor(Date.now() / 1000)) as number) * 1000
      ),
    };

    // ✅ Handle Razorpay events
    switch (event) {
      case "payment.captured":
      case "invoice.paid":
        await db.collection("payments").doc(entity.id).set(basePaymentData, { merge: true });
        console.log("✅ Payment captured:", basePaymentData);

        // Optional booking sync (if listingId exists)
        if (entity.notes?.listingId) {
          await db.collection("bookings").doc(entity.id).set(
            {
              listingId: entity.notes.listingId,
              userId: entity.notes?.userId || "guest",
              totalPrice: entity.amount / 100,
              status: "confirmed",
              paymentId: entity.id,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
        break;

      case "subscription.charged":
      case "subscription.activated":
      case "subscription.completed":
        await db.collection("subscriptions").doc(entity.id).set(
          {
            userId: entity.notes?.userId ?? "guest",
            planId: entity.plan_id,
            status: entity.status,
            total_count: entity.total_count,
            paid_count: entity.paid_count,
            next_due_at: entity.current_end,
            start_at: entity.start_at,
            end_at: entity.end_at,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        console.log("✅ Subscription updated:", entity.id);
        break;

      default:
        console.log(`ℹ️ Ignored Razorpay event: ${event}`);
    }

    return res.status(200).send("Webhook processed successfully");
  } catch (error: any) {
    console.error("❌ Webhook error:", error.message, error.stack || "");
    return res.status(500).send("Server error");
  }
});
