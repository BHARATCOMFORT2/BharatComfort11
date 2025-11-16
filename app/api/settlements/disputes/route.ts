export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// app/api/settlements/disputes/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db, admin } from "@/lib/firebaseadmin";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/settlements/disputes
 * Body: { settlementId: string, action: "resolve" | "reject", remark?: string }
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
        { error: "Only admin can manage disputes" },
        { status: 403 }
      );
    }

    const { settlementId, action, remark } = await req.json();
    if (!settlementId || !action)
      return NextResponse.json(
        { error: "settlementId and action are required" },
        { status: 400 }
      );

    const ref = db.collection("settlements").doc(settlementId);
    const snap = await ref.get();

    if (!snap.exists)
      return NextResponse.json({ error: "Settlement not found" }, { status: 404 });

    const data = snap.data()!;
    if (!data.hasDispute)
      return NextResponse.json(
        { error: "No active dispute found for this settlement" },
        { status: 400 }
      );

    const now = admin.firestore.FieldValue.serverTimestamp();
    const newStatus = action === "resolve" ? "resolved" : "rejected";

    await ref.update({
      hasDispute: false,
      disputeStatus: newStatus,
      remark:
        remark ||
        (action === "resolve"
          ? "Dispute resolved by admin"
          : "Dispute rejected by admin"),
      updatedAt: now,
    });

    // Send partner email notification
    const partnerEmail = data.partnerEmail || "";
    const partnerName = data.partnerName || "Partner";
    if (partnerEmail) {
      await sendEmail(
        partnerEmail,
        `Your dispute has been ${newStatus}`,
        `
          <h3>Dispute ${newStatus}</h3>
          <p>Hello ${partnerName},</p>
          <p>Your dispute for settlement <b>#${settlementId}</b> (₹${Number(
          data.amount
        ).toLocaleString("en-IN")}) has been <b>${newStatus}</b> by the admin.</p>
          <p>Remark: ${remark || "(no remark)"}</p>
          ${
            newStatus === "resolved"
              ? `<p>Settlement status will now continue to payout if applicable.</p>`
              : `<p>Please contact support if you wish to appeal this decision.</p>`
          }
        `
      );
    }

    return NextResponse.json({
      success: true,
      message: `Dispute ${newStatus} successfully.`,
    });
  } catch (err) {
    console.error("Dispute Management Error:", err);
    return NextResponse.json(
      { error: "Failed to update dispute status" },
      { status: 500 }
    );
  }
}
