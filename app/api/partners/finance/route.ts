export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// app/api/partners/finance/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

/* Returns finance summary for the authenticated partner:
   - totalEarnings (sum of completed bookings.amount)
   - lastPayouts (list from settlements collection)
   - pendingPayoutAmount (sum of settlement requests with status "pending")
   Optional query params:
     - days (int) -> window for revenue calculation (default 90)
     - limit (for payouts list)
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
    const days = Math.min(Math.max(parseInt(url.searchParams.get("days") || "90", 10), 7), 365);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 200);

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 1) Sum completed bookings.amount for the partner since 'since'
    const bookingsSnap = await adminDb.collection("bookings")
      .where("partnerUid", "==", uid)
      .where("status", "==", "completed")
      .where("createdAt", ">=", since)
      .get();

    let totalEarnings = 0;
    bookingsSnap.forEach((doc) => {
      const data: any = doc.data();
      const amt = Number(data.amount || 0);
      totalEarnings += isFinite(amt) ? amt : 0;
    });

    // 2) Recent settlements (from your settlements collection)
    const settlementsSnap = await adminDb.collection("settlements")
      .where("partnerUid", "==", uid)
      .orderBy("requestedAt", "desc")
      .limit(limit)
      .get();

    const settlements = settlementsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // 3) pending payout sum
    const pendingSnap = await adminDb.collection("settlements")
      .where("partnerUid", "==", uid)
      .where("status", "==", "pending")
      .get();

    let pendingAmount = 0;
    pendingSnap.forEach((d) => {
      const data: any = d.data();
      pendingAmount += Number(data.amount || 0) || 0;
    });

    // 4) summarise
    return NextResponse.json({
      ok: true,
      windowDays: days,
      totalEarnings,
      settlements,
      pendingPayoutAmount: pendingAmount,
    });
  } catch (err: any) {
    console.error("partners/finance error:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
