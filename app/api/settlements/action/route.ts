export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/settlements/action
 * Admin updates the status of a settlement.
 */
export async function POST(req: Request) {
  try {
    // ✅ Verify Admin Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const role = (decoded as any).role || "partner";

    if (role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only admin can perform this action" },
        { status: 403 }
      );
    }

    // ✅ Parse Request Body
    const { settlementId, action, remark = "", utrNumber = "" } =
      await req.json();

    if (!settlementId || !action) {
      return NextResponse.json(
        { error: "settlementId and action are required" },
        { status: 400 }
      );
    }

    // ✅ Fetch Settlement Record
    const settlementRef = db.collection("settlements").doc(settlementId);
    const settlementSnap = await settlementRef.get();

    if (!settlementSnap.exists) {
      return NextResponse.json(
        { error: "Settlement not found" },
        { status: 404 }
      );
    }

    // ✅ Explicitly define type to avoid undefined issues
    const settlement = settlementSnap.data() as {
      partnerEmail?: string;
      partnerName?: string;
      status?: string;
      amount?: number;
    } | null;

    if (!settlement) {
      return NextResponse.json(
        { error: "Settlement data is missing" },
        { status: 500 }
      );
    }

    const partnerEmail = settlement.partnerEmail ?? "";
    const partnerName = settlement.partnerName ?? "Partner";

    let status = settlement.status ?? "pending";
    let emailSubject = "";
    let emailMessage = "";

    // ✅ Determine Action
    switch (action) {
      case "approve":
        status = "approved";
        emailSubject = "✅ Settlement Approved";
        emailMessage = `Your settlement request #${settlementId} has been approved by the admin.`;
        break;
      case "reject":
        status = "rejected";
        emailSubject = "❌ Settlement Rejected";
        emailMessage = `Your settlement request #${settlementId} was rejected. Remark: ${remark}`;
        break;
      case "hold":
        status = "on_hold";
        emailSubject = "⏸️ Settlement On Hold";
        emailMessage = `Your settlement request #${settlementId} has been placed on hold. Remark: ${remark}`;
        break;
      case "markPaid":
        status = "paid";
        emailSubject = "💸 Settlement Paid";
        emailMessage = `Your settlement #${settlementId} has been marked as paid.`;
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action provided" },
          { status: 400 }
        );
    }

    // ✅ Update Firestore Record (Admin SDK)
    await settlementRef.update({
      status,
      remark,
      utrNumber,
      updatedAt: FieldValue.serverTimestamp(),
      adminId: decoded.uid,
    });

    // ✅ Optional Email Notification
    if (partnerEmail) {
      try {
        await sendEmail(
          partnerEmail,
          emailSubject,
          `
          <h3>${emailSubject}</h3>
          <p><b>Settlement ID:</b> ${settlementId}</p>
          <p><b>Status:</b> ${status}</p>
          <p><b>Amount:</b> ₹${settlement.amount ?? "N/A"}</p>
          ${remark ? `<p><b>Remark:</b> ${remark}</p>` : ""}
          ${utrNumber ? `<p><b>UTR Number:</b> ${utrNumber}</p>` : ""}
          <p>— BHARATCOMFORT11 Finance Team</p>
        `
        );
      } catch (e) {
        console.warn("⚠️ Email send failed:", e);
      }
    }

    // ✅ Final Success Response
    return NextResponse.json({
      success: true,
      message: `Settlement ${status} successfully.`,
      status,
      settlementId,
    });
  } catch (error: any) {
    console.error("❌ Settlement action error:", error);
    return NextResponse.json(
      { error: "Failed to process settlement action" },
      { status: 500 }
    );
  }
}
