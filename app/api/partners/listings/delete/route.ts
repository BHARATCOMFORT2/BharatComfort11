// app/api/partners/listings/delete/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

function getAuthHeader(req: Request) {
  const h = (req as any).headers?.get ? (req as any).headers.get("authorization") : (req as any).headers?.authorization;
  return h || "";
}

export async function POST(req: Request) {
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

    const body = await req.json().catch(() => null);
    if (!body || !body.id) return NextResponse.json({ error: "Listing id is required" }, { status: 400 });

    const ref = adminDb.collection("listings").doc(body.id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    const docData = snap.data() || {};
    if (docData.partnerUid !== uid) return NextResponse.json({ error: "Not authorized to delete this listing" }, { status: 403 });

    // Soft-delete pattern: set status = deleted (recommended)
    await ref.update({ status: "deleted", deletedAt: new Date(), updatedAt: new Date() });

    // If you prefer hard delete:
    // await ref.delete();

    return NextResponse.json({ ok: true, id: body.id });
  } catch (err: any) {
    console.error("delete listing error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
