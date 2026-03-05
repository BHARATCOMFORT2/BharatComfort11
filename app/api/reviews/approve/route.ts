export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db, admin } from "@/lib/firebaseadmin";
import { sendEmail } from "@/lib/email";

/**
 POST /api/reviews/approve
 Body: { id: string, action: "approve" | "reject", reason?: string }
*/

export async function POST(req: Request) {
  try {
    /* -------------------------
       AUTH
    -------------------------- */

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const decoded = await getAuth().verifyIdToken(token);

    const role = (decoded as any).role || "user";

    if (role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can moderate reviews" },
        { status: 403 }
      );
    }

    /* -------------------------
       BODY
    -------------------------- */

    const { id, action, reason = "" } = await req.json();

    if (!id || !action) {
      return NextResponse.json(
        { error: "id and action required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    const reviewRef = db.collection("reviews").doc(id);

    const snap = await reviewRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    const review = snap.data()!;

    const newStatus = action === "approve" ? "approved" : "rejected";

    /* -------------------------
       UPDATE REVIEW STATUS
    -------------------------- */

    await reviewRef.update({
      status: newStatus,
      rejectReason: reason,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: decoded.email || "Admin",
    });

    /* -------------------------
       UPDATE LISTING RATING
    -------------------------- */

    if (newStatus === "approved") {

      const listingRef = db.collection("listings").doc(review.listingId);

      const reviewsSnap = await db
        .collection("reviews")
        .where("listingId", "==", review.listingId)
        .where("status", "==", "approved")
        .get();

      let totalRating = 0;

      reviewsSnap.forEach((doc) => {
        totalRating += doc.data().rating;
      });

      const totalReviews = reviewsSnap.size;

      const avgRating =
        totalReviews > 0
          ? Number((totalRating / totalReviews).toFixed(1))
          : 0;

      await listingRef.update({
        rating: avgRating,
        totalReviews,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    /* -------------------------
       EMAIL NOTIFICATION
    -------------------------- */

    const reviewerEmail = review.userEmail || "";
    const reviewerName = review.userName || "User";
    const listingName = review.listingName || "Listing";

    if (reviewerEmail) {
      await sendEmail(
        reviewerEmail,
        `Your review has been ${newStatus}`,
        `
        <h3>Review ${newStatus}</h3>

        <p>Hello ${reviewerName},</p>

        <p>Your review for <b>${listingName}</b> has been <b>${newStatus}</b>.</p>

        ${
          newStatus === "approved"
            ? "<p>⭐ Thank you for sharing your experience! Your review is now live.</p>"
            : `<p>Your review was rejected.</p><p>Reason: ${reason}</p>`
        }

        <br/>
        <p>— Team BharatComfort</p>
        `
      );
    }

    return NextResponse.json({
      success: true,
      message: `Review ${newStatus} successfully.`,
    });

  } catch (error) {
    console.error("Review moderation error:", error);

    return NextResponse.json(
      { error: "Failed to update review status" },
      { status: 500 }
    );
  }
}
