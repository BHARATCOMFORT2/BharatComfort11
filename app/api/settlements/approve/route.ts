export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// app/api/settlements/approve/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import admin from "firebase-admin";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/settlements/approve
 * Body: { settlementId: string, action: "approve" | "reject", remark?: string }
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
        { error: "Only admin can approve settlements" },
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
      return NextResponse.json(
        { error: "Settlement not found" },
        { status: 404 }
      );

    const data = snap.data()!;
    if (data.status !== "requested") {
      return NextResponse.json(
        { error: `Cannot ${action} settlement already marked as ${data.status}` },
        { status: 400 }
      );
    }

    const now = new Date();
    const newStatus = action === "approve" ? "approved" : "rejected";

    const updateData: Record<string, any> = {
      status: newStatus,
      remark:
        remark ||
        (action === "approve"
          ? "Approved by admin"
          : "Rejected by admin"),
      updatedAt: now,
    };

    if (action === "approve") updateData.approvedAt = now;
    else updateData.rejectedAt = now;

    await ref.update(updateData);

    // ✅ Log in system logs
    await db.collection("system_logs").add({
      type: `settlement_${action}`,
      settlementId,
      adminId: decoded.uid,
      remark: remark || "",
      createdAt: now,
    });

    // ✅ Send notification emails
    const partnerEmail = data.partnerEmail || "";
    const partnerName = data.partnerName || "Partner";

    if (partnerEmail) {
      try {
        await sendEmail(
          partnerEmail,
          `Your settlement has been ${newStatus}`,
          `
            <h3>Settlement ${newStatus}</h3>
            <p>Hello ${partnerName},</p>
            <p>Your settlement request for <b>₹${Number(
              data.amountRequested || 0
            ).toLocaleString("en-IN")}</b> has been <b>${newStatus}</b> by the admin.</p>
            <p><b>Remark:</b> ${remark || "(no remark)"}</p>
            ${
              newStatus === "approved"
                ? `<p>💰 It will be processed soon for payout.</p>`
                : `<p>⚠️ You can contact support if you believe this was an error.</p>`
            }
          `
        );
      } catch (emailErr) {
        console.warn("⚠️ Email send failed:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Settlement ${newStatus} successfully.`,
    });
  } catch (err) {
    console.error("Settlement approval error:", err);
    return NextResponse.json(
      { error: "Failed to process settlement approval" },
      { status: 500 }
    );
  }
}
