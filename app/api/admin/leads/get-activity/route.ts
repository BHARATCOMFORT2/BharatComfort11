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
    const adminUid = decoded.uid;

    // ensure admin caller
    const callerSnap = await adminDb.collection("staff").doc(adminUid).get();
    const caller = callerSnap.exists ? callerSnap.data() : null;
    if (!(caller && (caller.role === "admin" || caller.role === "superadmin"))) {
      return NextResponse.json({ success:false, message:"Unauthorized" }, { status:403 });
    }

    const body = await req.json().catch(()=>({}));
    const { leadId, limit = 200 } = body || {};
    if (!leadId) return NextResponse.json({ success:false, message:"leadId required" }, { status:400 });

    const leadSnap = await adminDb.collection("leads").doc(leadId).get();
    if (!leadSnap.exists) return NextResponse.json({ success:false, message:"Lead not found" }, { status:404 });
    const leadData = leadSnap.data();

    // fetch logs subcollection (descending createdAt)
    const logsSnap = await adminDb.collection("leads").doc(leadId).collection("logs").orderBy("createdAt", "desc").limit(Number(limit)).get();

    const logs: any[] = [];
    logsSnap.forEach((l) => {
      logs.push({ id: l.id, ...l.data() });
    });

    return NextResponse.json({ success:true, lead: { id: leadSnap.id, ...leadData }, logs });
  } catch (err: any) {
    console.error("admin get activity error:", err);
    return NextResponse.json({ success:false, message:"Failed to load activity" }, { status:500 });
  }
}
