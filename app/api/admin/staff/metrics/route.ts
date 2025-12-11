// app/api/admin/staff/metrics/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();

    const authHeader = req.headers.get("authorization") || "";
    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m) return NextResponse.json({ success: false, message: "Missing Authorization" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(m[1], true);
    const callerUid = decoded.uid;

    // caller must be admin/superadmin
    const callerSnap = await adminDb.collection("staff").doc(callerUid).get();
    const caller = callerSnap.exists ? callerSnap.data() : null;
    if (!(caller && (caller.role === "admin" || caller.role === "superadmin"))) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { staffId } = body || {};
    if (!staffId) return NextResponse.json({ success: false, message: "staffId required" }, { status: 400 });

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfToday.getDate() - 1);

    // Query leads assigned to staff
    const snap = await adminDb.collection("leads").where("assignedTo", "==", staffId).get();

    let totalLeads = 0;
    let totalCalls = 0;
    let totalNotes = 0;
    let convertedLeads = 0;
    let todaysCalls = 0;
    let yesterdaysCalls = 0;

    snap.forEach((d) => {
      totalLeads += 1;
      const data = d.data();

      if (data.status === "converted") convertedLeads += 1;

      // callLogs (array) count
      if (Array.isArray(data.callLogs)) {
        totalCalls += data.callLogs.length;
        for (const cl of data.callLogs) {
          const created = cl?.createdAt?.toDate ? cl.createdAt.toDate() : new Date(cl.createdAt || null);
          if (!created || isNaN(created.getTime())) continue;
          if (created >= startOfToday) todaysCalls += 1;
          else if (created >= startOfYesterday && created < startOfToday) yesterdaysCalls += 1;
        }
      }

      // notes count
      if (Array.isArray(data.notes)) totalNotes += data.notes.length;
    });

    const metrics = {
      totalLeads,
      totalCalls,
      totalNotes,
      convertedLeads,
      todaysCalls,
      yesterdaysCalls,
    };

    return NextResponse.json({ success: true, metrics });
  } catch (err: any) {
    console.error("staff metrics error:", err);
    return NextResponse.json({ success: false, message: "Failed to load metrics" }, { status: 500 });
  }
}
