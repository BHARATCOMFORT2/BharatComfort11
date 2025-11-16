export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// app/api/partners/insights/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

/* Returns lightweight insights for partner:
   - bookingsCount (total in window)
   - revenue (sum of completed bookings.amount)
   - bookingsPerDay: array for last N days (default 30)
   - cancellations count
   Query params:
     - days (int, default 30, max 90)
*/
function getAuthHeader(req: Request) {
  const auth = (req as any).headers?.get
    ? (req as any).headers.get("authorization")
    : (req as any).headers?.authorization;
  return auth || "";
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
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
    const days = Math.min(Math.max(parseInt(url.searchParams.get("days") || "30", 10), 7), 90);

    const end = startOfDay(new Date());
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000); // inclusive

    // Fetch bookings in this range (limit safety)
    const bookingsSnap = await adminDb.collection("bookings")
      .where("partnerUid", "==", uid)
      .where("createdAt", ">=", start)
      .where("createdAt", "<=", new Date(end.getTime() + 24*60*60*1000 - 1))
      .get();

    // Build per-day buckets
    const buckets: Record<string, { count: number; revenue: number; cancelled: number }> = {};
    for (let i=0;i<days;i++){
      const d = new Date(start.getTime() + i*24*60*60*1000);
      const key = startOfDay(d).toISOString().slice(0,10);
      buckets[key] = { count:0, revenue:0, cancelled:0 };
    }

    let totalRevenue = 0;
    let totalBookings = 0;
    let totalCancelled = 0;

    bookingsSnap.forEach(doc => {
      const b: any = doc.data();
      const created = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt ? new Date(b.createdAt) : null);
      if (!created) return;
      const key = startOfDay(created).toISOString().slice(0,10);
      if (!buckets[key]) return; // outside range
      buckets[key].count += 1;
      totalBookings += 1;
      const amt = Number(b.amount || 0);
      if (b.status === "completed") {
        buckets[key].revenue += isFinite(amt) ? amt : 0;
        totalRevenue += isFinite(amt) ? amt : 0;
      }
      if (b.status === "cancelled" || b.status === "refunded") {
        buckets[key].cancelled += 1;
        totalCancelled += 1;
      }
    });

    // convert to array
    const bookingsPerDay = Object.keys(buckets).sort().map(k => ({ day: k, ...buckets[k] }));

    return NextResponse.json({
      ok: true,
      totalBookings,
      totalRevenue,
      totalCancelled,
      bookingsPerDay,
    });
  } catch (err: any) {
    console.error("partners/insights error:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
