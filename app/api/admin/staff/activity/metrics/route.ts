// app/api/admin/staff/activity/metrics/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

function getAuthHeader(req: Request) {
  return (req as any).headers?.get ? req.headers.get("authorization") : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    const authHeader = getAuthHeader(req);
    if (!authHeader) return NextResponse.json({ success:false, message:"Missing Authorization" }, { status:401 });
    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m) return NextResponse.json({ success:false, message:"Bad Authorization header" }, { status:401 });

    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(m[1], true);
    const callerUid = decoded.uid;

    const callerSnap = await adminDb.collection("staff").doc(callerUid).get();
    const caller = callerSnap.exists ? callerSnap.data() : null;
    if (!(caller && (caller.role === "admin" || caller.role === "superadmin"))) {
      return NextResponse.json({ success:false, message:"Unauthorized" }, { status:403 });
    }

    const body = await req.json().catch(()=>({}));
    const { staffId } = body || {};
    if (!staffId) return NextResponse.json({ success:false, message:"staffId required" }, { status:400 });

    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0,0,0,0);
    const startYesterday = new Date(startToday); startYesterday.setDate(startToday.getDate()-1);

    const snap = await adminDb.collection("leads").where("assignedTo","==",staffId).get();

    let totalLeads = 0, totalCalls = 0, totalNotes = 0, converted = 0, todaysCalls = 0, yesterdaysCalls = 0;
    snap.forEach((d) => {
      totalLeads++;
      const ld = d.data();
      if (ld.status === "converted") converted++;

      if (Array.isArray(ld.callLogs)) {
        totalCalls += ld.callLogs.length;
        ld.callLogs.forEach((cl:any) => {
          const created = cl?.createdAt?.toDate ? cl.createdAt.toDate() : new Date(cl.createdAt || null);
          if (!created || isNaN(created.getTime())) return;
          if (created >= startToday) todaysCalls++;
          else if (created >= startYesterday && created < startToday) yesterdaysCalls++;
        });
      }

      if (Array.isArray(ld.notes)) totalNotes += ld.notes.length;
    });

    return NextResponse.json({ success:true, metrics: { totalLeads, totalCalls, totalNotes, converted, todaysCalls, yesterdaysCalls } });
  } catch (err:any) {
    console.error("metrics error:", err);
    return NextResponse.json({ success:false, message:"Failed" }, { status:500 });
  }
}
