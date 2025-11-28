// app/api/partners/listings/create/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

function getAuthHeader(req: Request) {
  const h = (req as any).headers?.get
    ? (req as any).headers.get("authorization")
    : (req as any).headers?.authorization;
  return h || "";
}

export async function POST(req: Request) {
  try {
    const authHeader = getAuthHeader(req);
    if (!authHeader)
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );

    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m)
      return NextResponse.json(
        { error: "Malformed Authorization header" },
        { status: 401 }
      );

    const idToken = m[1];
    let decoded: any;

    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    const body = await req.json().catch(() => null);
    if (!body)
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );

    // Minimal validation
    const { title, description, price, location, metadata } = body;
    if (!title || typeof title !== "string")
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );

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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await docRef.set(payload);

    return NextResponse.json({
      ok: true,
      listingId: docRef.id,
      listing: payload,
    });
  } catch (err: any) {
    console.error("create listing error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
