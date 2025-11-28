// app/api/admin/staff/performance/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

// ✅ Auth header helper
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function GET(req: Request) {
  try {
    // ✅ Admin Auth
    const authHeader = getAuthHeader(req);
    if (!authHeader)
      return NextResponse.json(
        { error: "Missing Authorization" },
        { status: 401 }
      );

    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m)
      return NextResponse.json(
        { error: "Bad Authorization header" },
        { status: 401 }
      );

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(m[1], true);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (!decoded.admin) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    // ✅ Query param: days (7–365)
    const url = new URL(req.url);
    const days = Math.min(
      Math.max(Number(url.searchParams.get("days") || 30), 7),
      365
    );

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // ✅ ✅ REAL STAFF SOURCE (ONLY APPROVED + ACTIVE TELECALLERS)
    const staffSnap = await adminDb
      .collection("staff")
      .where("role", "==", "telecaller")
      .where("status", "==", "approved")
      .where("isActive", "==", true)
      .get();

    const results: any[] = [];

    for (const staffDoc of staffSnap.docs) {
      const staff = staffDoc.data();
      const staffId = staffDoc.id;

      // ✅ Fetch leads assigned to this staff in date window
      const leadsSnap = await adminDb
        .collection("leads")
        .where("assignedTo", "==", staffId)
        .where("createdAt", ">=", since)
        .get();

      let totalLeads = 0;
      let contacted = 0;
      let interested = 0;
      let followups = 0;
      let converted = 0;

      leadsSnap.forEach((doc) => {
        const lead: any = doc.data();
        totalLeads += 1;

        const status = lead.status || "";

        if (status === "contacted") contacted += 1;
        if (status === "interested") interested += 1;
        if (status === "followup" || status === "callback") followups += 1;
        if (status === "converted") converted += 1;
      });

      results.push({
        staffId,
        name: staff.name || null,
        email: staff.email || null,
        totalLeads,
        contacted,
        interested,
        followups,
        converted,
      });
    }

    return NextResponse.json({
      success: true,
      windowDays: days,
      data: results,
    });
  } catch (err: any) {
    console.error("Staff performance API error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
