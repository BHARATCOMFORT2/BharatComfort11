import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import {
  doc,
  getDoc,
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/settlements/dispute
 * Partner raises a dispute for a settlement.
 *
 * Body:
 * {
 *   settlementId: string,
 *   reason: string,
 *   description?: string,
 *   fileUrl?: string
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
    const uid = decoded.uid;
    const role = (decoded as any).role || "partner";

    if (role !== "partner") {
      return NextResponse.json(
        { error: "Only partners can raise disputes" },
        { status: 403 }
      );
    }

    const { settlementId, reason, description = "", fileUrl = "" } =
      await req.json();

    if (!settlementId || !reason) {
      return NextResponse.json(
        { error: "settlementId and reason are required" },
        { status: 400 }
      );
    }

    // Check if settlement exists
    const settlementRef = doc(db, "settlements", settlementId);
    const settlementSnap = await getDoc(settlementRef);

    if (!settlementSnap.exists()) {
      return NextResponse.json(
        { error: "Settlement not found" },
        { status: 404 }
      );
    }

    const settlement = settlementSnap.data();

    // Create dispute entry
    const disputesRef = collection(db, "settlement_disputes");
    const disputeDoc = await addDoc(disputesRef, {
      settlementId,
      partnerId: uid,
      partnerEmail: decoded.email || "",
      partnerName: decoded.name || "",
      reason,
      description,
      fileUrl,
      status: "open",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      adminRemark: "",
      partnerReplies: [],
      slaEscalated: false,
    });

    // Update settlement to mark dispute
    await updateDoc(settlementRef, {
      hasDispute: true,
      updatedAt: serverTimestamp(),
    });

    // Send email notification to admin
    try {
      await sendEmail(
        "admin@bharatcomfort11.com",
        `⚠️ New Dispute Raised on Settlement ${settlementId}`,
        `
          <h3>New Settlement Dispute Raised</h3>
          <p><b>Settlement ID:</b> ${settlementId}</p>
          <p><b>Partner:</b> ${decoded.email}</p>
          <p><b>Reason:</b> ${reason}</p>
          <p><b>Description:</b> ${description || "—"}</p>
          ${
            fileUrl
              ? `<p><b>Attachment:</b> <a href="${fileUrl}" target="_blank">View file</a></p>`
              : ""
          }
          <p>Please log in to the admin dashboard to review this dispute.</p>
        `
      );
    } catch (e) {
      console.warn("Admin email notification failed:", e);
    }

    return NextResponse.json({
      success: true,
      disputeId: disputeDoc.id,
    });
  } catch (error) {
    console.error("Dispute creation error:", error);
    return NextResponse.json(
      { error: "Failed to raise dispute" },
      { status: 500 }
    );
  }
}
