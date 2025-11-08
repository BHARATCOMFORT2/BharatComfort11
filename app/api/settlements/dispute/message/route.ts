import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/settlements/dispute/message
 * Used by both partner & admin to send a new message in a dispute chat thread.
 *
 * Body:
 * {
 *   disputeId: string,
 *   text?: string,
 *   fileUrl?: string
 * }
 */
export async function POST(req: Request) {
  try {
    // ✅ Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const role = ((decoded as any).role as string) || "partner";
    const uid = decoded.uid;

    // ✅ Input
    const { disputeId, text = "", fileUrl = "" } = await req.json();
    if (!disputeId || (!text && !fileUrl)) {
      return NextResponse.json(
        { error: "disputeId and (text or fileUrl) are required" },
        { status: 400 }
      );
    }

    // ✅ Verify dispute exists (Admin SDK)
    const disputeRef = db.collection("settlement_disputes").doc(disputeId);
    const disputeSnap = await disputeRef.get();
    if (!disputeSnap.exists) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }
    const dispute = disputeSnap.data() || {};

    // ✅ Add message to subcollection
    const messagesRef = disputeRef.collection("messages");
    await messagesRef.add({
      text,
      fileUrl,
      uid,
      role,
      createdAt: FieldValue.serverTimestamp(),
    });

    // ✅ Update parent dispute
    const newStatus =
      dispute.status === "open" && role === "admin" ? "in_review" : dispute.status;

    await disputeRef.update({
      updatedAt: FieldValue.serverTimestamp(),
      status: newStatus,
    });

    // ✅ Notify counterparty (best-effort)
    try {
      const isPartner = role === "partner";
      const subject = isPartner
        ? `New Message from Partner - Dispute ${disputeId}`
        : `Update on Your Dispute ${disputeId}`;
      const recipient = isPartner ? "admin@bharatcomfort11.com" : (dispute.partnerEmail || "");

      if (recipient) {
        const html = `
          <h3>${subject}</h3>
          <p><b>Dispute ID:</b> ${disputeId}</p>
          ${
            text
              ? `<p><b>Message:</b> ${text}</p>`
              : "<p><b>Attachment:</b> Attached file received.</p>"
          }
          ${fileUrl ? `<p><a href="${fileUrl}" target="_blank">View Attachment</a></p>` : ""}
          <p>— BHARATCOMFORT11 Finance Portal</p>
        `;
        await sendEmail(recipient, subject, html);
      }
    } catch (e) {
      console.warn("Email notification failed:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Dispute message error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
