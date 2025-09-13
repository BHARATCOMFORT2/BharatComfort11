import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * Utility: Basic profanity filter (can be replaced with AI/3rd-party API later)
 */
const bannedWords = ["spamword", "badword", "offensive"]; // extend this list
function containsBannedWords(text: string): boolean {
  const lower = text.toLowerCase();
  return bannedWords.some((word) => lower.includes(word));
}

/**
 * Trigger: When a new review is created
 */
export const reviewModeration = functions.firestore
  .document("reviews/{reviewId}")
  .onCreate(async (snap, context) => {
    const review = snap.data();
    const reviewId = context.params.reviewId;

    console.log("📝 New review received:", reviewId, review);

    let moderationStatus = "approved";
    let moderationReason = "Clean review";

    // 1️⃣ Check for banned words
    if (containsBannedWords(review.content || "")) {
      moderationStatus = "flagged";
      moderationReason = "Contains inappropriate language";
    }

    // 2️⃣ Check rating abuse (e.g., spammy 1★ or 5★ floods)
    if (review.rating < 1 || review.rating > 5) {
      moderationStatus = "flagged";
      moderationReason = "Invalid rating value";
    }

    // 3️⃣ Save moderation results
    await db.collection("reviews").doc(reviewId).update({
      moderation: {
        status: moderationStatus,
        reason: moderationReason,
        checkedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });

    // 4️⃣ Notify admins if review was flagged
    if (moderationStatus === "flagged") {
      await db.collection("notifications").add({
        title: "🚨 Review flagged for moderation",
        message: `Review by user ${review.userId} on listing ${review.listingId} requires admin attention.`,
        type: "review_flagged",
        userId: "admin", // system-wide notification
        reviewId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.warn("⚠️ Review flagged:", reviewId, moderationReason);
    } else {
      console.log("✅ Review approved automatically:", reviewId);
    }
  });
