export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// Helper
function getAuthHeader(req: Request) {
  return req.headers.get("authorization");
}

export async function GET(req: Request) {
  try {
    /* -------------------------------
       1️⃣ ADMIN TOKEN VERIFY
    --------------------------------*/
    const authHeader = getAuthHeader(req);
    if (!authHeader)
      return NextResponse.json({ success: false, message: "Missing Authorization" }, { status: 401 });

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match)
      return NextResponse.json({ success: false, message: "Invalid Authorization header" }, { status: 401 });

    const token = match[1];
    const { auth: adminAuth, db } = getFirebaseAdmin();

    const decoded = await adminAuth.verifyIdToken(token, true);
    const adminId = decoded.uid;

    /* -------------------------------
       2️⃣ VERIFY ADMIN (staff collection)
    --------------------------------*/
    const adminSnap = await db.collection("staff").doc(adminId).get();
    const adminData = adminSnap.data();

    if (!adminSnap.exists || !["admin", "superadmin"].includes(adminData?.role)) {
      return NextResponse.json({ success: false, message: "Admin access denied" }, { status: 403 });
    }

    /* -------------------------------
       3️⃣ READ QUERY PARAMS
    --------------------------------*/
    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId") || "";
    const days = Number(searchParams.get("days") || 30);

    const now = new Date();
    const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    /* -------------------------------
       4️⃣ FETCH ALL APPROVED TELECALLERS
    --------------------------------*/
    const staffSnap = await db
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
         5️⃣ FETCH LEADS FOR EACH TELECALLER
      --------------------------------*/
      const leadsSnap = await db
        .collection("leads")
        .where("assignedTo", "==", sid)
        .get();

      let totalLeads = 0;
      let contacted = 0;
      let interested = 0;
      let followups = 0;
      let converted = 0;
      let lastNote = "";

      leadsSnap.forEach((doc) => {
        const lead = doc.data();

        // UpdatedAt filter
        const updated = lead.updatedAt?.toDate?.();
        if (!updated) return;
        if (updated < fromDate) return;

        totalLeads++;

        const status = lead.status || "new";

        if (status !== "new") contacted++;
        if (status === "interested") interested++;
        if (status === "callback") followups++;
        if (status === "converted") converted++;

        // Latest note priority
        if (lead.lastRemark) lastNote = lead.lastRemark;
        else if (!lastNote && lead.partnerNotes) lastNote = lead.partnerNotes;
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
  } catch (err: any) {
    console.error("Performance API Error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Performance fetch failed" },
      { status: 500 }
    );
  }
}
