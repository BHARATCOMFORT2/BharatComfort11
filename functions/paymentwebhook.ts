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

    // ✅ Razorpay sends signature in this header
    const signature = req.headers["x-razorpay-signature"] as string;
    if (!signature) {
      console.error("❌ Missing Razorpay signature");
      return res.status(400).send("Signature missing");
    }

    // ✅ Verify webhook signature using rawBody
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update((req as any).rawBody) // Firebase provides rawBody for verification
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("❌ Invalid Razorpay webhook signature");
      return res.status(400).send("Invalid signature");
    }

    const { event, payload } = req.body;
    const entity =
      payload?.payment?.entity || payload?.invoice?.entity || null;

    if (!entity) {
      console.error("❌ No entity payload found in webhook");
      return res.status(400).send("No payload found");
    }

    console.log(`📦 Razorpay Webhook Received: ${event}`);

    // ✅ Handle common payment events
    if (event === "payment.captured" || event === "invoice.paid") {
      const paymentData = {
        userId: entity.notes?.userId || "guest",
        amount: entity.amount / 100, // convert from paise
        currency: entity.currency,
        status: entity.status,
        paymentId: entity.id,
        orderId: entity.order_id || null,
        invoiceId: entity.invoice_id || null,
        invoiceUrl: entity.invoice_url || null,
        createdAt: admin.firestore.Timestamp.fromMillis(
          (entity.created_at || Math.floor(Date.now() / 1000)) * 1000
        ),
      };

      // ✅ Store or update payment document
      await db.collection("payments").doc(entity.id).set(paymentData, { merge: true });

      // ✅ Optional: mirror into "bookings" collection (if linked to a listing)
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

      console.log("✅ Payment captured and saved:", paymentData);
    } else {
      console.log(`ℹ️ Ignored webhook event: ${event}`);
    }

    return res.status(200).send("Webhook received successfully");
  } catch (error: any) {
    console.error("❌ Webhook processing error:", error.message, error.stack || "");
    return res.status(500).send("Server error");
  }
});
