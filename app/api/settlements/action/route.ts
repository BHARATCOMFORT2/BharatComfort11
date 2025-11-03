import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { sendEmail } from "@/lib/email"; // helper to send email notifications

/**
 * POST /api/settlements/action
 * Admin updates the status of a settlement.
 *
 * Body:
 * {
 *   settlementId: string,
 *   action: "approve" | "reject" | "hold" | "markPaid",
 *   remark?: string,
 *   utrNumber?: string
 * }
 */
export async function POST(req: Request) {
  try {
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

    const { settlementId, action, remark = "", utrNumber = "" } =
      await req.json();

    if (!settlementId || !action) {
      return NextResponse.json(
        { error: "settlementId and action are required" },
        { status: 400 }
      );
    }

    const settlementRef = doc(db, "settlements", settlementId);
    const settlementSnap = await getDoc(settlementRef);

    if (!settlementSnap.exists()) {
      return NextResponse.json({ error: "Settlement not found" }, { status: 404 });
    }

    const settlement = settlementSnap.data();
    const partnerEmail = settlement.partnerEmail || "";

    let status = settlement.status;
    let emailSubject = "";
    let emailMessage = "";

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

    // Update Firestore record
    await updateDoc(settlementRef, {
      status,
      remark,
      utrNumber,
      updatedAt: serverTimestamp(),
      adminId: decoded.uid,
    });

    // Optional email notification to partner
    if (partnerEmail) {
      try {
        await sendEmail(
          partnerEmail,
          emailSubject,
          `
          <h3>${emailSubject}</h3>
          <p><b>Settlement ID:</b> ${settlementId}</p>
          <p><b>Status:</b> ${status}</p>
          <p><b>Amount:</b> ₹${settlement.amount}</p>
          ${remark ? `<p><b>Remark:</b> ${remark}</p>` : ""}
          ${utrNumber ? `<p><b>UTR Number:</b> ${utrNumber}</p>` : ""}
          <p>— BHARATCOMFORT11 Finance Team</p>
        `
        );
      } catch (e) {
        console.warn("Email send failed:", e);
      }
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Settlement action error:", error);
    return NextResponse.json(
      { error: "Failed to process settlement action" },
      { status: 500 }
    );
  }
}
