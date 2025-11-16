export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// app/api/partners/listings/create/route.ts
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
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    // minimal validation - expand as needed
    const { title, description, price, location, metadata } = body;
    if (!title || typeof title !== "string") return NextResponse.json({ error: "title is required" }, { status: 400 });

    const docRef = adminDb.collection("listings").doc();
    const payload = {
      id: docRef.id,
      partnerUid: uid,
      title,
      description: description || "",
      price: typeof price === "number" ? price : Number(price) || 0,
      location: location || null,
      metadata: metadata || {},
      status: "active",
      createdAt: adminDb.FieldValue ? adminDb.FieldValue.serverTimestamp() : new Date(),
      updatedAt: adminDb.FieldValue ? adminDb.FieldValue.serverTimestamp() : new Date(),
    };

    // Firestore admin SDK doesn't expose adminDb.FieldValue in our wrapper variable; use serverTimestamp via admin SDK:
    // To be safe use direct admin timestamp via update below if needed. Simpler: set createdAt as new Date()
    await docRef.set({
      ...payload,
      createdAt: adminDb instanceof Object ? adminDb.doc ? payload.createdAt : payload.createdAt : payload.createdAt
    });

    return NextResponse.json({ ok: true, listingId: docRef.id, listing: payload });
  } catch (err: any) {
    console.error("create listing error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
