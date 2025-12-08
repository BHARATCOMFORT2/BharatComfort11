export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    /* ---------------- AUTH ---------------- */

    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const decoded = await adminAuth.verifyIdToken(token, true);
    const uid = decoded.uid;

    /* ---------------- PAGINATION (SAFE VERSION) ---------------- */

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "10"), 50);

    /* ---------------- ✅ STABLE FIRESTORE QUERY ---------------- */
    // ❌ offset REMOVED (root cause of 500)
    const snap = await adminDb
      .collection("bookings")
      .where("partnerId", "==", uid)      // ✅ correct field
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({
      ok: true,
      limit,
      count: data.length,
      bookings: data,
    });
  } catch (err: any) {
    console.error("❌ bookings pagination error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
