import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { sendEmail } from "@/lib/email"; // uses your existing email util

/**
 * POST /api/settlements/dispute/message
 * Body: { disputeId: string, text?: string, fileUrl?: string }
 * Role: partner or admin
 * Effect:
 *  - Appends a message to `settlement_disputes/{id}/messages`
 *  - Updates dispute.updatedAt
 *  - Sends email notification to the counterparty (admin or partner)
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decoded = await getAuth().verifyIdToken(idToken);
    const role = (decoded as any).role || "partner"; // "partner" | "admin"

    const { disputeId, text = "", fileUrl = "" } = await req.json();

    if (!disputeId || (!text && !fileUrl)) {
      return NextResponse.json(
        { error: "disputeId and (text or fileUrl) are required" },
        { status: 400 }
      );
    }

    // Fetch dispute
    const disputeRef = doc(db, "settlement_disputes", disputeId);
    const disputeSnap = await getDoc(disputeRef);
    if (!disputeSnap.exists()) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }
    const dispute = disputeSnap.data();

    // Append message in subcollection
    const messagesRef = collection(disputeRef, "messages");
    const messageDoc = await addDoc(messagesRef, {
      text,
      fileUrl,
      role,          // "partner" or "admin"
      uid: decoded.uid,
      createdAt: serverTimestamp(),
    });

    // Touch updatedAt (and move to in_review if currently open)
    const newStatus =
      dispute.status === "open" && role === "admin" ? "in_review" : dispute.status;
    await updateDoc(disputeRef, {
      updatedAt: serverTimestamp(),
      status: newStatus,
    });

    // Email notification to counterparty
    try {
      const isPartner = role === "partner";
      const subject = isPartner
        ? `New message from Partner on Dispute ${disputeId}`
        : `Update on your dispute ${disputeId}`;
      const recipient = isPartner
        ? "admin@bharatcomfort11.com" // admin mailbox
        : dispute.partnerEmail || ""; // store partnerEmail on dispute when creating

      if (recipient) {
        const html = `
          <h3>${subject}</h3>
          <p><b>Settlement ID:</b> ${dispute.settlementId || "-"}</p>
          ${text ? `<p><b>Message:</b> ${text}</p>` : ""}
          ${fileUrl ? `<p><b>Attachment:</b> <a href="${fileUrl}" target="_blank">View file</a></p>` : ""}
          <p style="margin-top:12px;">Open dashboard to reply.</p>
        `;
        await sendEmail(recipient, subject, html);
      }
    } catch (e) {
      console.error("Email notify failed:", e);
      // don't fail the API if email fails
    }

    return NextResponse.json({
      success: true,
      messageId: messageDoc.id,
      status: newStatus,
    });
  } catch (error) {
    console.error("Dispute message error:", error);
    return NextResponse.json(
      { error: "Failed to post dispute message" },
      { status: 500 }
    );
  }
}
