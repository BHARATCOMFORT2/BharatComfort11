import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendEmail } from "@/lib/email";

/**
 * GET /api/settlements/dispute/sla
 *
 * Automatically escalates disputes that exceed SLA timelines.
 * - Open > 3 days → escalated_admin
 * - In Review > 7 days → escalated_finance
 * Sends notification emails to admin and partner.
 */
export async function GET() {
  try {
    // ✅ Using Admin SDK methods — no `collection()` import needed
    const disputesRef = db.collection("settlement_disputes");
    const snapshot = await disputesRef.get();

    const now = Date.now();
    let escalated = 0;

    for (const docSnap of snapshot.docs) {
      const dispute = docSnap.data();

      const createdAt = dispute.createdAt?.toMillis?.() || now;
      const updatedAt = dispute.updatedAt?.toMillis?.() || createdAt;
      const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24);

      let newStatus = null;
      if (dispute.status === "open" && daysSinceUpdate >= 3) {
        newStatus = "escalated_admin";
      } else if (dispute.status === "in_review" && daysSinceUpdate >= 7) {
        newStatus = "escalated_finance";
      }

      if (!newStatus) continue;

      // ✅ Update Firestore document (Admin SDK style)
      const ref = db.collection("settlement_disputes").doc(docSnap.id);
      await ref.update({
        status: newStatus,
        updatedAt: FieldValue.serverTimestamp(),
        slaEscalated: true,
      });
      escalated++;

      // ✅ Send escalation emails
      try {
        const partnerEmail = dispute.partnerEmail || "";
        const subject = `⚠️ Dispute ${docSnap.id} Escalated (${newStatus})`;
        const html = `
          <h3>Dispute Escalated: ${docSnap.id}</h3>
          <p><b>Settlement ID:</b> ${dispute.settlementId}</p>
          <p><b>Reason:</b> ${dispute.reason}</p>
          <p><b>Current Status:</b> ${newStatus}</p>
          <p>This dispute has been automatically escalated due to SLA breach.</p>
          <p>— BHARATCOMFORT11 Finance Automation</p>
        `;

        const adminMail = "admin@bharatcomfort11.com";
        const financeMail = "finance@bharatcomfort11.com";

        const recipients = [adminMail, financeMail];
        if (partnerEmail) recipients.push(partnerEmail);

        await Promise.all(
          recipients.map((email) => sendEmail(email, subject, html))
        );
      } catch (e) {
        console.warn("⚠️ Escalation email failed:", e);
      }
    }

    return NextResponse.json({
      success: true,
      escalated,
      message: `${escalated} disputes escalated successfully.`,
    });
  } catch (error) {
    console.error("❌ SLA escalation job error:", error);
    return NextResponse.json(
      { error: "Failed to process SLA escalation." },
      { status: 500 }
    );
  }
}
