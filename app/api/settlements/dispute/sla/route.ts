import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseadmin";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { sendEmail } from "@/lib/email";

/**
 * GET /api/settlements/dispute/sla
 * Checks all open/in_review disputes.
 * - If a dispute is open > 3 days → escalates to admin
 * - If a dispute is in_review > 7 days → escalates to finance manager
 * - Sends reminder email to both partner and admin
 */
export async function GET() {
  try {
    const disputesRef = collection(db, "settlement_disputes");
    const snapshot = await getDocs(disputesRef);

    if (snapshot.empty) {
      return NextResponse.json({ message: "No disputes found." });
    }

    const now = Date.now();
    let escalated = 0;

    for (const docSnap of snapshot.docs) {
      const d = docSnap.data();
      const createdAt = d.createdAt?.seconds ? d.createdAt.seconds * 1000 : 0;
      const updatedAt = d.updatedAt?.seconds ? d.updatedAt.seconds * 1000 : 0;

      const ageDays = (now - (updatedAt || createdAt)) / (1000 * 60 * 60 * 24);

      // Escalation conditions
      let newStatus = null;
      if (d.status === "open" && ageDays >= 3) {
        newStatus = "escalated_admin";
      } else if (d.status === "in_review" && ageDays >= 7) {
        newStatus = "escalated_finance";
      }

      if (newStatus) {
        const ref = doc(db, "settlement_disputes", docSnap.id);
        await updateDoc(ref, {
          status: newStatus,
          updatedAt: serverTimestamp(),
          slaEscalated: true,
        });
        escalated++;

        // Send email to both parties
        const partnerEmail = d.partnerEmail || "";
        const subject = `⚠️ Dispute ${docSnap.id} escalated (${newStatus})`;
        const html = `
          <h3>Dispute Escalated: ${docSnap.id}</h3>
          <p><b>Settlement ID:</b> ${d.settlementId}</p>
          <p><b>Reason:</b> ${d.reason}</p>
          <p><b>Current Status:</b> ${newStatus}</p>
          <p>This dispute has been escalated due to inactivity beyond the SLA period.</p>
          <p>Please log in to review and respond.</p>
        `;
        await Promise.all([
          partnerEmail ? sendEmail(partnerEmail, subject, html) : Promise.resolve(),
          sendEmail("admin@bharatcomfort11.com", subject, html),
        ]);
      }
    }

    return NextResponse.json({
      success: true,
      escalated,
      message: `${escalated} disputes escalated.`,
    });
  } catch (error) {
    console.error("SLA job error:", error);
    return NextResponse.json(
      { error: "Failed to process SLA escalation." },
      { status: 500 }
    );
  }
}
