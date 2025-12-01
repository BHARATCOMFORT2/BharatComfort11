export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// ✅ AUTH HEADER HELPER
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    /* ✅ ADMIN TOKEN VERIFY */
    const authHeader = getAuthHeader(req);
    if (!authHeader)
      return NextResponse.json(
        { success: false, message: "Missing Authorization" },
        { status: 401 }
      );

    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m)
      return NextResponse.json(
        { success: false, message: "Bad Authorization" },
        { status: 401 }
      );

    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();

    const decoded = await adminAuth.verifyIdToken(m[1], true);
    const adminId = decoded.uid;

    /* ✅ VERIFY ADMIN FROM FIRESTORE */
    const adminSnap = await adminDb.collection("admins").doc(adminId).get();
    if (!adminSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Admin access denied" },
        { status: 403 }
      );
    }

    /* ✅ INPUT (OPTIONAL FILTERS) */
    const body = await req.json();
    const { staffId, from, to } = body || {};

    let fromDate: Date | null = from ? new Date(from) : null;
    let toDate: Date | null = to ? new Date(to) : null;

    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    /* ✅ FETCH ALL TELECALLERS */
    const staffSnap = await adminDb
      .collection("staff")
      .where("role", "==", "telecaller")
      .where("status", "==", "approved")
      .where("isActive", "==", true)
      .get();

    const performance: any[] = [];

    for (const staffDoc of staffSnap.docs) {
      const sid = staffDoc.id;

      // ✅ Optional telecaller filter
      if (staffId && staffId !== sid) continue;

      const staffData = staffDoc.data();

      const leadsSnap = await adminDb
        .collection("leads")
        .where("assignedTo", "==", sid)
        .get();

      let totalLeads = 0;
      let contacted = 0;
      let interested = 0;
      let followups = 0;
      let converted = 0;
      let lastNote = "";

      leadsSnap.docs.forEach((doc) => {
        const lead = doc.data();

        // ✅ DATE FILTER (updatedAt)
        if (fromDate || toDate) {
          if (!lead.updatedAt?.toDate) return;
          const updated = lead.updatedAt.toDate();

          if (fromDate && updated < fromDate) return;
          if (toDate && updated > toDate) return;
        }

        totalLeads++;

        const status = lead.status || "";

        if (status === "contacted") contacted++;
        if (status === "interested") interested++;
        if (status === "callback") followups++;
        if (status === "converted") converted++;

        // ✅ Strongest recent note logic
        if (lead.lastRemark) {
          lastNote = lead.lastRemark;
        } else if (!lastNote && lead.partnerNotes) {
          lastNote = lead.partnerNotes;
        }
      });

      performance.push({
        staffId: sid,
        name: staffData.name || "",
        email: staffData.email || "",
        totalLeads,
        contacted,
        interested,
        followups,
        converted,
        lastNote,
      });
    }

    return NextResponse.json({
      success: true,
      data: performance,
    });
  } catch (err: any) {
    console.error("Performance API Error:", err);

    return NextResponse.json(
      { success: false, message: err?.message || "Performance fetch failed" },
      { status: 500 }
    );
  }
}
