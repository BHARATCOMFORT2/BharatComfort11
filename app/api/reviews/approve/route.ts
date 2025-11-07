// app/api/reviews/approve/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db, admin } from "@/lib/firebaseadmin";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/reviews/approve
 * Body: { id: string, action: "approve" | "reject" }
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const role = (decoded as any).role || "user";

    if (role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can approve or reject reviews" },
        { status: 403 }
      );
    }

    const { id, action } = await req.json();
    if (!id || !action)
      return NextResponse.json(
        { error: "id and action are required" },
        { status: 400 }
      );

    const ref = db.collection("reviews").doc(id);
    const snap = await ref.get();

    if (!snap.exists)
      return NextResponse.json({ error: "Review not found" }, { status: 404 });

    const data = snap.data()!;
    const reviewerEmail = data.userEmail || "";
    const reviewerName = data.userName || "User";
    const listingName = data.listingName || "Listing";

    const newStatus = action === "approve" ? "approved" : "rejected";

    await ref.update({
      status: newStatus,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: decoded.email || "Unknown Admin",
    });

    // Send email notification to reviewer
    if (reviewerEmail) {
      await sendEmail(
        reviewerEmail,
        `Your review has been ${newStatus}`,
        `
          <h3>Review ${newStatus}</h3>
          <p>Hello ${reviewerName},</p>
          <p>Your review for <b>${listingName}</b> has been <b>${newStatus}</b> by our moderation team.</p>
          ${
            newStatus === "approved"
              ? "<p>⭐ Thank you for sharing your experience! Your review is now live.</p>"
              : "<p>Your review was rejected due to policy or content issues. You may edit and resubmit.</p>"
          }
          <br/>
          <p>— Team BharatComfort11</p>
        `
      );
    }

    return NextResponse.json({
      success: true,
      message: `Review ${newStatus} successfully.`,
    });
  } catch (err) {
    console.error("Review approval error:", err);
    return NextResponse.json(
      { error: "Failed to update review status" },
      { status: 500 }
    );
  }
}
