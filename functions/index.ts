import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * 🔔 Send notification when a new listing is added
 */
export const onListingCreated = functions.firestore
  .document("listings/{listingId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (!data) return;

    // Notify all users about trending/new listing
    const notification = {
      title: "New Listing Added",
      message: `${data.name} is now available for booking.`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: "listing",
      listingId: context.params.listingId,
    };

    await db.collection("notifications").add(notification);
  });

/**
 * ⭐ Auto-moderate reviews (simple bad word filter)
 */
export const onReviewCreated = functions.firestore
  .document("reviews/{reviewId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (!data) return;

    const bannedWords = ["badword1", "badword2"];
    const hasBannedWord = bannedWords.some((w) =>
      data.text.toLowerCase().includes(w)
    );

    if (hasBannedWord) {
      await snap.ref.update({ status: "flagged" });
    } else {
      await snap.ref.update({ status: "approved" });
    }
  });

/**
 * 💳 Stripe Webhook Listener (for payments)
 * Needs to be connected with your API route: /app/api/webhook/route.ts
 */
export const stripeWebhook = functions.https.onRequest((req, res) => {
  // This proxies Stripe events to Next.js API
  // Good for handling server-side payment confirmation
  console.log("Received Stripe event:", req.body.type);
  res.sendStatus(200);
});
