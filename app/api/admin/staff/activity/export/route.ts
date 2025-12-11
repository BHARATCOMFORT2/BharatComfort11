// app/api/admin/staff/activity/export/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * POST body same as activity API (required: staffId)
 * Returns CSV as text/plain with Content-Disposition attachment
 */

function getAuthHeader(req: Request) {
  return (req as any).headers?.get ? req.headers.get("authorization") : (req as any).headers?.authorization;
}

function escapeCsvCell(v: any) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
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

    const body = await req.json().catch(() => ({}));
    const { staffId, from, to, types, leadId } = body || {};
    if (!staffId) return NextResponse.json({ success:false, message:"staffId required" }, { status:400 });

    // Reuse activity API logic by calling it internally (we could refactor, but quick approach: fetch items by constructing query)
    // For simplicity we'll call the route function directly is not possible here, so replicate a simple call:
    // We'll call activity endpoint via internal fetch (safe because same host)
    const baseUrl = process.env.NEXT_PUBLIC_INTERNAL_BASE || ""; // optional host override
    const apiPath = "/api/admin/staff/activity";
    const host = baseUrl || `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("host")}`;

    // POST to internal route with same token
    const activityRes = await fetch(`${host}${apiPath}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ staffId, from, to, types, leadId, limit: 10000 }),
    });

    const activityJson = await activityRes.json();
    if (!activityRes.ok || !activityJson.success) {
      return NextResponse.json({ success:false, message: activityJson?.message || "Failed to fetch activity for export" }, { status: 500 });
    }

    const items = activityJson.items || [];

    // CSV header
    const header = ["timestamp","type","staffId","leadId","leadName","status","outcome","text","meta"].map(escapeCsvCell).join(",");
    const rows = items.map((it: any) => {
      const row = [
        it.createdAt || "",
        it.type || "",
        it.staffId || "",
        it.leadId || "",
        it.leadName || "",
        it.status || it.outcome || "",
        it.outcome || "",
        it.text || "",
        JSON.stringify(it.meta || {})
      ].map(escapeCsvCell).join(",");
      return row;
    });

    const csv = [header, ...rows].join("\n");

    const filename = `staff-${staffId}-activity-${new Date().toISOString().slice(0,10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("export error:", err);
    return NextResponse.json({ success:false, message:"Export failed" }, { status:500 });
  }
}
