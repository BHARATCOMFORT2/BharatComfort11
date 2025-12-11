// app/api/admin/staff/performance/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// Helper
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    /* -------------------------------
       ✅ ADMIN TOKEN VERIFY
    --------------------------------*/
    const authHeader = getAuthHeader(req);
    if (!authHeader)
      return NextResponse.json({ success: false, message: "Missing Authorization" }, { status: 401 });

    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m)
      return NextResponse.json({ success: false, message: "Invalid Authorization header" }, { status: 401 });

    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(m[1], true);
    const adminId = decoded.uid;

    /* -------------------------------
       ✅ VERIFY ADMIN FROM STAFF COLLECTION
    --------------------------------*/
    const adminSnap = await adminDb.collection("staff").doc(adminId).get();
    const adminData = adminSnap.data();

    if (
      !adminSnap.exists ||
      !["admin", "superadmin"].includes(adminData?.role)
    ) {
      return NextResponse.json(
        { success: false, message: "Admin access denied" },
        { status: 403 }
      );
    }

    /* -------------------------------
       INPUT PARSING
    --------------------------------*/
    const body = await req.json();
    const { staffId, from, to } = body || {};

    let fromDate = from ? new Date(from) : null;
    let toDate = to ? new Date(to) : null;

    if (toDate) toDate.setHours(23, 59, 59, 999);

    /* -------------------------------
       FETCH ALL APPROVED TELECALLERS
    --------------------------------*/
    const staffSnap = await adminDb
      .collection("staff")
      .where("role", "==", "telecaller")
      .where("status", "==", "approved")
      .where("isActive", "==", true)
      .get();

    const performance = [];

    for (const staffDoc of staffSnap.docs) {
      const sid = staffDoc.id;

      if (staffId && staffId !== sid) continue;

      const staffData = staffDoc.data();

      /* -------------------------------
         FETCH LEADS ASSIGNED TO STAFF
      --------------------------------*/
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

        // DATE FILTER
        if (fromDate || toDate) {
          if (!lead.updatedAt?.toDate) return;
          const updated = lead.updatedAt.toDate();

          if (fromDate && updated < fromDate) return;
          if (toDate && updated > toDate) return;
        }

        totalLeads++;

        const status = lead.status || "";

        if (status !== "new") contacted++;

        if (status === "interested") interested++;

        if (status === "callback") followups++;

        if (status === "converted") converted++;

        // Last note priority
        if (lead.lastRemark) {
          lastNote = lead.lastRemark;
        } else if (lead.partnerNotes && !lastNote) {
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

    return NextResponse.json({ success: true, data: performance });
  } catch (err) {
    console.error("Performance API Error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Performance fetch failed" },
      { status: 500 }
    );
  }
}
