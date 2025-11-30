export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

// ✅ ADMIN VERIFY
async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.split("Bearer ")[1];
  const decoded = await adminAuth.verifyIdToken(token);

  if (!["admin", "superadmin"].includes(decoded.role)) {
    throw new Error("Permission denied");
  }

  return decoded;
}

// ✅ TELECALLER + DATE-WISE PERFORMANCE + NOTES API
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);

    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") || "30");

    const fromDate = new Date();
    fromDate.setHours(0, 0, 0, 0);
    fromDate.setDate(fromDate.getDate() - days);

    // ✅ ALL APPROVED TELECALLERS
    const staffSnap = await adminDb
      .collection("staff")
      .where("role", "==", "telecaller")
      .where("status", "==", "approved")
      .get();

    const performance: any[] = [];

    for (const staffDoc of staffSnap.docs) {
      const staffId = staffDoc.id;
      const staffData = staffDoc.data();

      // ✅ LEADS ASSIGNED TO THIS TELECALLER (DATE-WISE)
      const leadsSnap = await adminDb
        .collection("leads")
        .where("assignedTo", "==", staffId)
        .where("updatedAt", ">=", fromDate)
        .get();

      let totalLeads = leadsSnap.size;
      let contacted = 0;
      let interested = 0;
      let followups = 0;
      let converted = 0;
      let lastNote = "";

      const notes: {
        leadId: string;
        note: string;
        status: string;
        date: any;
      }[] = [];

      leadsSnap.forEach((doc) => {
        const lead = doc.data();

        if (lead.status === "contacted") contacted++;
        if (lead.status === "interested") interested++;
        if (lead.status === "follow-up") followups++;
        if (lead.status === "converted") converted++;

        // ✅ NOTES COLLECTION
        if (lead.lastRemark) {
          notes.push({
            leadId: doc.id,
            note: lead.lastRemark,
            status: lead.status || "",
            date: lead.updatedAt || null,
          });

          lastNote = lead.lastRemark; // ✅ Latest note
        }
      });

      performance.push({
        staffId,
        name: staffData.name || "",
        email: staffData.email || "",
        totalLeads,
        contacted,
        interested,
        followups,
        converted,
        lastNote, // ✅ For Table Column
        notes,    // ✅ For Expandable View
      });
    }

    return NextResponse.json({
      success: true,
      data: performance,
    });
  } catch (err: any) {
    console.error("Performance API Error:", err);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Performance fetch failed",
      },
      { status: 500 }
    );
  }
}
