export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// app/api/partners/listings/list/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

function getAuthHeader(req: Request) {
  const h = (req as any).headers?.get ? (req as any).headers.get("authorization") : (req as any).headers?.authorization;
  return h || "";
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
    catch { return NextResponse.json({ error: "Invalid token" }, { status: 401 }); }

    const uid = decoded.uid;

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 100);
    const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
    const offset = (page - 1) * limit;

    // For moderate sizes offset is ok; recommend cursor-based later
    const collectionRef = adminDb.collection("listings")
      .where("partnerUid", "==", uid)
      .orderBy("createdAt", "desc");

    const snap = await collectionRef.offset(offset).limit(limit).get();

    const listings = snap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));

    return NextResponse.json({ ok: true, page, limit, total: listings.length, listings });
  } catch (err: any) {
    console.error("list listings error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
