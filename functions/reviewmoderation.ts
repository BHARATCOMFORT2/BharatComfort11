/**
 * Trigger: When a review moderation status is updated by staff/admin
 */
export const reviewModerationUpdate = functions.firestore
  .document("reviews/{reviewId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // If moderation status changed by staff/admin
    if (
      before.moderation?.status !== after.moderation?.status &&
      ["approved", "rejected"].includes(after.moderation?.status)
    ) {
      const reviewId = context.params.reviewId;

      console.log(
        `🛠️ Review ${reviewId} moderation updated from ${before.moderation?.status} → ${after.moderation?.status}`
      );

      // Notify user about their review status
      await db.collection("notifications").add({
        title:
          after.moderation?.status === "approved"
            ? "✅ Your review has been approved"
            : "❌ Your review has been rejected",
        message:
          after.moderation?.status === "approved"
            ? "Your review is now visible to everyone."
            : "Your review was rejected due to policy violations.",
        type: "review_update",
        userId: after.userId,
        reviewId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
