import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export const razorpayWebhook = functions.https.onRequest(async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const signature = req.headers["x-razorpay-signature"] as string;
    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("❌ Invalid Razorpay signature");
      return res.status(400).send("Invalid signature");
    }

    const event = req.body.event;
    const payload = req.body.payload?.payment?.entity;

    if (!payload) {
      return res.status(400).send("No payment payload");
    }

    // Save payment info
    await db.collection("payments").doc(payload.id).set(
      {
        orderId: payload.order_id,
        paymentId: payload.id,
        amount: payload.amount / 100,
        currency: payload.currency,
        status: payload.status,
        email: payload.email,
        contact: payload.contact,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        event,
      },
      { merge: true }
    );

    // ✅ If payment captured → create booking
    if (payload.status === "captured") {
      const orderSnap = await db.collection("orders").doc(payload.order_id).get();

      if (orderSnap.exists) {
        const orderData = orderSnap.data();

        await db.collection("bookings").add({
          userId: orderData?.userId || null,
          listingId: orderData?.listingId || null,
          paymentId: payload.id,
          amount: payload.amount / 100,
          status: "confirmed",
          checkIn: orderData?.checkIn || null,
          checkOut: orderData?.checkOut || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log("✅ Booking created for payment:", payload.id);
      }
    }

    return res.status(200).send("ok");
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).send("Webhook error");
  }
});
