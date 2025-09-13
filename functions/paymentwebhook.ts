import * as functions from "firebase-functions";
import Razorpay from "razorpay";
import crypto from "crypto";
import admin from "./firebaseAdmin"; // your firebase admin config

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const razorpayWebhook = functions.https.onRequest(
  async (req, res) => {
    try {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

      // ✅ Verify signature
      const signature = req.headers["x-razorpay-signature"] as string;
      const body = JSON.stringify(req.body);

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body)
        .digest("hex");

      if (expectedSignature !== signature) {
        console.error("❌ Invalid webhook signature");
        return res.status(400).send("Invalid signature");
      }

      const event = req.body.event;
      const payload = req.body.payload;

      console.log("🔔 Razorpay webhook event:", event);

      // Handle subscription events
      if (event === "subscription.activated") {
        const subscription = payload.subscription.entity;
        await admin.firestore().collection("subscriptions").doc(subscription.id).set({
          status: "active",
          userId: subscription.customer_id,
          plan: subscription.plan_id,
          start: subscription.start_at,
          end: subscription.end_at,
        });
      }

      if (event === "subscription.charged") {
        const payment = payload.payment.entity;
        await admin.firestore().collection("payments").doc(payment.id).set({
          amount: payment.amount / 100,
          currency: payment.currency,
          status: payment.status,
          subscriptionId: payment.subscription_id,
          createdAt: payment.created_at,
        });
      }

      if (event === "subscription.cancelled") {
        const subscription = payload.subscription.entity;
        await admin.firestore().collection("subscriptions").doc(subscription.id).update({
          status: "cancelled",
        });
      }

      return res.status(200).send("Webhook received");
    } catch (error: any) {
      console.error("❌ Webhook error:", error.message);
      return res.status(500).send("Server error");
    }
  }
);
