// app/api/stories/approve/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db, admin } from "@/lib/firebaseadmin";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/stories/approve
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
        { error: "Only admins can approve stories" },
        { status: 403 }
      );
    }

    const { id, action } = await req.json();
    if (!id || !action)
      return NextResponse.json(
        { error: "id and action are required" },
        { status: 400 }
      );

    const ref = db.collection("stories").doc(id);
    const snap = await ref.get();

    if (!snap.exists)
      return NextResponse.json({ error: "Story not found" }, { status: 404 });

    const data = snap.data()!;
    const authorEmail = data.authorEmail || "";
    const authorName = data.authorName || "User";

    const newStatus = action === "approve" ? "approved" : "rejected";

    await ref.update({
      status: newStatus,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: decoded.email || "Unknown Admin",
    });

    // Send email notification
    if (authorEmail) {
      await sendEmail(
        authorEmail,
        `Your story has been ${newStatus}`,
        `
          <h3>Story ${newStatus}</h3>
          <p>Hello ${authorName},</p>
          <p>Your story titled <b>"${data.title}"</b> has been <b>${newStatus}</b> by our content team.</p>
          ${
            newStatus === "approved"
              ? "<p>🎉 It’s now live on BharatComfort11!</p>"
              : "<p>You may review and resubmit it after making improvements.</p>"
          }
          <br/>
          <p>— Team BharatComfort11</p>
        `
      );
    }

    return NextResponse.json({
      success: true,
      message: `Story ${newStatus} successfully.`,
    });
  } catch (err) {
    console.error("Story approval error:", err);
    return NextResponse.json(
      { error: "Failed to update story status" },
      { status: 500 }
    );
  }
}
