export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    /* ─────────────────────────────
       ✅ 1️⃣ AUTH VERIFY
    ───────────────────────────── */
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = await adminAuth.verifyIdToken(token, true);
    const uid = decoded.uid;

    /* ─────────────────────────────
       ✅ 2️⃣ PAGINATION (SAFE)
    ───────────────────────────── */
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 50);

    /* ─────────────────────────────
       ✅ 3️⃣ STABLE FIRESTORE QUERY
       ❌ offset REMOVED (ROOT CAUSE)
    ───────────────────────────── */
    const snap = await adminDb
      .collection("listings")
      .where("partnerId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const listings = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() || {}),
    }));

    return NextResponse.json({
      ok: true,
      limit,
      total: listings.length,
      listings,
    });
  } catch (err: any) {
    console.error("❌ list listings error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
