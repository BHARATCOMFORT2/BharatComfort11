import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * ⏰ Scheduled Function: Detect Trending Listings & Create Notifications
 * Runs every hour (adjust CRON as needed).
 */
export const trendingNotifications = functions.pubsub
  .schedule("every 1 hours")
  .timeZone("Asia/Kolkata") // adjust to your target timezone
  .onRun(async () => {
    try {
      // Example logic: trending = listings with > 50 views in last 24h
      const cutoff = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      const listingsSnap = await db
        .collection("listings")
        .where("lastViewedAt", ">", cutoff)
        .get();

      const trendingListings = listingsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((listing: any) => listing.views && listing.views > 50);

      if (trendingListings.length === 0) {
        console.log("No trending listings found.");
        return null;
      }

      // Create notifications for each trending listing
      for (const listing of trendingListings) {
        const notification = {
          title: "🔥 Trending Now",
          message: `${listing.name} is trending on BharatComfort!`,
          listingId: listing.id,
          type: "trending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection("notifications").add(notification);
        console.log("Notification created for:", listing.name);
      }

      return null;
    } catch (err) {
      console.error("Error in trendingNotifications:", err);
      return null;
    }
  });
