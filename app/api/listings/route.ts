export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    /* ───────────── AUTH (OPTIONAL) ───────────── */
    const authHeader = req.headers.get("authorization");
    let uid: string | null = null;
    let role: string | null = null;

    // ✅ Token optional hai (guest ke liye)
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      try {
        const decoded: any = await adminAuth.verifyIdToken(token, true);
        uid = decoded.uid;
        role = decoded.role || decoded.customClaims?.role || "user";
      } catch {
        uid = null;
        role = null;
      }
    }

    /* ───────────── PAGINATION ───────────── */
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 50);
    const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
    const offset = (page - 1) * limit;

    /* ───────────── BASE QUERY ───────────── */
    let query: FirebaseFirestore.Query = adminDb
      .collection("listings")
      .orderBy("createdAt", "desc");

    /* ─────────────────────────────────────
       ✅ ✅ ✅ ROLE BASED FILTER (FINAL FIX)
    ───────────────────────────────────── */

    // ✅ PARTNER → ONLY OWN LISTINGS
    if (role === "partner" && uid) {
      query = query.where("partnerId", "==", uid);
    }

    // ✅ USER / GUEST → ONLY ACTIVE
    else {
      query = query.where("status", "==", "active");
    }

    /* ───────────── FETCH ───────────── */
    const snap = await query.offset(offset).limit(limit).get();

    const listings = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({
      ok: true,
      role: role || "guest",
      page,
      limit,
      total: listings.length,
      listings,
    });
  } catch (err: any) {
    console.error("❌ unified listings error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
