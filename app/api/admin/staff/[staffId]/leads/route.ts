export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

function getAuthHeader(req: Request) {
  return (req as any).headers?.get ? req.headers.get("authorization") : (req as any).headers?.authorization;
}

function toJSDate(val: any): Date | null {
  try {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (val?.toDate) return val.toDate();
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
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

    // ensure caller is admin
    const callerSnap = await adminDb.collection("staff").doc(adminUid).get();
    const caller = callerSnap.exists ? callerSnap.data() : null;
    if (!(caller && (caller.role === "admin" || caller.role === "superadmin"))) {
      return NextResponse.json({ success:false, message:"Unauthorized" }, { status:403 });
    }

    const body = await req.json().catch(()=>({}));
    const { staffId } = body || {};
    if (!staffId) return NextResponse.json({ success:false, message:"staffId required" }, { status:400 });

    // fetch leads assignedTo staffId
    const snapshot = await adminDb.collection("leads").where("assignedTo", "==", staffId).get();
    const now = new Date();
    const leads: any[] = [];
    snapshot.forEach((s) => {
      const d = s.data();
      leads.push({
        id: s.id,
        name: d.name || "",
        businessName: d.businessName || "",
        phone: d.phone || d.mobile || d.contact || "",
        status: d.status || "new",
        followupDate: d.followupDate || null,
        lastCalledAt: d.lastCalledAt || null,
        notesCount: Array.isArray(d.notes) ? d.notes.length : 0,
        callLogsCount: Array.isArray(d.callLogs) ? d.callLogs.length : 0,
        createdAt: d.createdAt || null,
        updatedAt: d.updatedAt || null,
      });
    });

    // sort latest first
    leads.sort((a,b)=> {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return tb - ta;
    });

    return NextResponse.json({ success:true, leads });
  } catch (err: any) {
    console.error("admin staff leads error:", err);
    return NextResponse.json({ success:false, message:"Failed to load staff leads" }, { status:500 });
  }
}
