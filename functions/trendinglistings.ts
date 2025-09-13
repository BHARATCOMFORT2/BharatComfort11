import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as sgMail from "@sendgrid/mail";

admin.initializeApp();
const db = admin.firestore();
const fcm = admin.messaging();

// SendGrid API Key from Firebase env
sgMail.setApiKey(functions.config().sendgrid.apikey);

/**
 * Trigger: When listing is marked as trending
 */
export const trendingListings = functions.firestore
  .document("listings/{listingId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const listingId = context.params.listingId;

    if (!after) return null;

    // Trigger only when isTrending changes from false → true
    if (before?.isTrending === false && after?.isTrending === true) {
      console.log(`🔥 Listing ${listingId} is now trending!`);

      // Build notification message
      const messageTitle = "🔥 Trending Now!";
      const messageBody = `${after.name} is trending! Book now before it’s gone.`;

      // 1️⃣ Firestore notifications (for all users)
      const usersSnapshot = await db.collection("users").get();
      const batch = db.batch();

      usersSnapshot.forEach((doc) => {
        const userId = doc.id;
        const notifRef = db.collection("notifications").doc();
        batch.set(notifRef, {
          title: messageTitle,
          message: messageBody,
          type: "trending",
          listingId,
          userId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false,
        });
      });

      await batch.commit();
      console.log("📩 Firestore notifications created for all users");

      // 2️⃣ Push Notifications (FCM)
      const tokensSnapshot = await db
        .collectionGroup("fcmTokens")
        .get();

      if (!tokensSnapshot.empty) {
        const tokens = tokensSnapshot.docs.map((doc) => doc.id);

        const payload: admin.messaging.MulticastMessage = {
          notification: {
            title: messageTitle,
            body: messageBody,
          },
          data: {
            listingId,
            type: "trending",
          },
          tokens,
        };

        const response = await fcm.sendEachForMulticast(payload);
        console.log("📲 Push notifications sent:", response.successCount);
      } else {
        console.log("⚠️ No FCM tokens found.");
      }

      // 3️⃣ Email Notifications (Optional: only premium users or all users)
      for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();
        if (!user.email) continue;

        const msg = {
          to: user.email,
          from: "noreply@bharatcomfort.com",
          subject: "🔥 Trending Listing Alert",
          text: `${after.name} is trending now! Don’t miss out.`,
          html: `
            <h2>🔥 Trending Now on BharatComfort</h2>
            <p><b>${after.name}</b> is trending right now! 🚀</p>
            <p>Book now before the offer ends:</p>
            <a href="https://bharatcomfort.com/listings/${listingId}">👉 View Listing</a>
          `,
        };

        await sgMail.send(msg);
      }

      console.log("📧 Email alerts sent.");
    }

    return null;
  });
