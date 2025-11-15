// app/api/partners/bookings/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

/* Returns bookings for the authenticated partner.
   Optional query params:
     - status (e.g. completed, cancelled)
     - limit (int, default 100)
     - from / to (ISO date strings) => filter by createdAt
*/
function getAuthHeader(req: Request) {
  const auth = (req as any).headers?.get
    ? (req as any).headers.get("authorization")
    : (req as any).headers?.authorization;
  return auth || "";
}

export async function GET(req: Request) {
  try {
    const authHeader = getAuthHeader(req);
    if (!authHeader) return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m) return NextResponse.json({ error: "Malformed Authorization header" }, { status: 401 });
    const idToken = m[1];

    let decoded;
    try { decoded = await adminAuth.verifyIdToken(idToken, true); }
    catch { return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 }); }
    const uid = decoded.uid;

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status") || null;
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10) || 100, 1000);

    // Optional date range (ISO)
    const from = url.searchParams.get("from"); // e.g. 2025-10-01
    const to = url.searchParams.get("to");

    let q = adminDb.collection("bookings").where("partnerUid", "==", uid);

    if (statusFilter) q = q.where("status", "==", statusFilter);

    // apply date filter if provided (assumes createdAt is a Firestore Timestamp)
    if (from) {
      const fromTs = new Date(from);
      q = q.where("createdAt", ">=", fromTs);
    }
    if (to) {
      const toTs = new Date(to);
      q = q.where("createdAt", "<=", toTs);
    }

    // require index on partnerUid + createdAt if you use createdAt ordering/where
    const snap = await q.orderBy("createdAt", "desc").limit(limit).get();

    const bookings = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ ok: true, total: bookings.length, bookings });
  } catch (err: any) {
    console.error("partners/bookings error:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
