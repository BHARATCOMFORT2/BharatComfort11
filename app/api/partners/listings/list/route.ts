export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

function getAuthHeader(req: Request) {
  return req.headers.get("authorization") || "";
}

export async function GET(req: Request) {
  try {
    /* ✅ AUTH */
    const authHeader = getAuthHeader(req);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace("Bearer ", "").trim();

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    /* ✅ PAGINATION */
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 100);
    const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
    const offset = (page - 1) * limit;

    /* ✅ PARTNER LISTINGS – BOTH OLD & NEW FORMAT */
    const snap1 = await adminDb
      .collection("listings")
      .where("partnerId", "==", uid)
      .get();

    const snap2 = await adminDb
      .collection("listings")
      .where("metadata.partnerId", "==", uid)
      .get();

    /* ✅ MERGE + DE-DUPE */
    const map = new Map<string, any>();

    for (const d of snap1.docs) {
      const data = d.data() || {};
      if (data.status !== "deleted") {
        map.set(d.id, { id: d.id, ...data });
      }
    }

    for (const d of snap2.docs) {
      const data = d.data() || {};
      if (data.status !== "deleted") {
        map.set(d.id, { id: d.id, ...data });
      }
    }

    /* ✅ SORT BY CREATED DATE (DESC) */
    const all = Array.from(map.values()).sort((a, b) => {
      const toMillis = (ts: any) =>
        ts?.toMillis?.() ??
        (typeof ts?._seconds === "number" ? ts._seconds * 1000 : 0);

      return toMillis(b.createdAt) - toMillis(a.createdAt);
    });

    const pageItems = all.slice(offset, offset + limit);

    return NextResponse.json({
      ok: true,
      page,
      limit,
      total: all.length,
      listings: pageItems,
    });
  } catch (err: any) {
    console.error("❌ list listings error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
