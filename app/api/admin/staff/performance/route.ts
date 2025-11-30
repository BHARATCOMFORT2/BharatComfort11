export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

// ✅ ADMIN VERIFY
async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

  const token = authHeader.split("Bearer ")[1];
  const decoded = await adminAuth.verifyIdToken(token);

  if (!["admin", "superadmin"].includes(decoded.role)) {
    throw new Error("Permission denied");
  }

  return decoded;
}

// ✅ TELECALLER-WISE PERFORMANCE (READ ONLY)
export async function GET(req: Request) {
  try {
    await verifyAdmin(req);

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId"); // ✅ telecaller filter (optional)

    // ✅ TELECALLERS
    const staffSnap = await adminDb
      .collection("staff")
      .where("role", "==", "telecaller")
      .where("status", "==", "approved")
      .get();

    const performance: any[] = [];

    for (const staffDoc of staffSnap.docs) {
      const sid = staffDoc.id;

      // ✅ FILTER: agar admin ne specific telecaller select kiya ho
      if (staffId && staffId !== sid) continue;

      const staffData = staffDoc.data();

      // ✅ ONLY READ FROM LEADS (NO WRITE)
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

      leadsSnap.forEach((doc) => {
        const lead = doc.data();
        totalLeads++;

        const status = lead.status || "";

        if (status === "contacted") contacted++;
        if (status === "interested") interested++;
        if (status === "callback") followups++;   // ✅ telecaller flow match
        if (status === "converted") converted++;

        if (lead.lastRemark || lead.partnerNotes) {
          lastNote = lead.lastRemark || lead.partnerNotes;
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
