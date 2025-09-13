import * as functions from "firebase-functions";
import * as crypto from "crypto";

export const razorpayWebhook = functions.https.onRequest((req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const signature = req.headers["x-razorpay-signature"] as string;
    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (signature === expectedSignature) {
      console.log("✅ Payment verified:", req.body);

      // Example: Save payment status in Firestore
      // await admin.firestore().collection("payments").add(req.body);

      return res.status(200).send("ok");
    } else {
      console.error("❌ Invalid signature");
      return res.status(400).send("Invalid signature");
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).send("Webhook error");
  }
});
