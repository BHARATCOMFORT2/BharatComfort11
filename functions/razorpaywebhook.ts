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

    // ✅ Verify using raw body
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update((req as any).rawBody) // Firebase provides rawBody
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("❌ Invalid webhook signature");
      return res.status(400).send("Invalid signature");
    }

    const event = req.body.event;
    const payload =
      req.body.payload?.payment?.entity || req.body.payload?.invoice?.entity;

    if (!payload) {
      console.error("❌ No payload in webhook");
      return res.status(400).send("No payload found");
    }

    if (event === "payment.captured" || event === "invoice.paid") {
      const paymentData = {
        userId: payload.notes?.userId || null,
        amount: payload.amount,
        currency: payload.currency,
        status: payload.status,
        createdAt: payload.created_at || Math.floor(Date.now() / 1000),
        paymentId: payload.id,
        orderId: payload.order_id || null,
        invoiceUrl: payload.invoice_url || null, // ✅ Save invoice link
      };

      await db.collection("payments").doc(payload.id).set(paymentData, { merge: true });
      console.log("✅ Payment saved:", paymentData);
    }

    return res.status(200).send("Webhook received");
  } catch (error: any) {
    console.error("❌ Webhook error:", error.message, error.stack || "");
    return res.status(500).send("Server error");
  }
});
