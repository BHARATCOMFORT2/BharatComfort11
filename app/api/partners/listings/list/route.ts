export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = await adminAuth.verifyIdToken(token, true);
    const uid = decoded.uid;

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 20), 50);

    // 🔥🔥🔥 OFFSET REMOVED (THIS WAS CAUSING 500)
    const snap = await adminDb
      .collection("listings")
      .where("partnerId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const listings = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({
      ok: true,
      listings,
      total: listings.length,
    });
  } catch (err: any) {
    console.error("❌ LISTINGS FETCH ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
