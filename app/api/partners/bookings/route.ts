// app/api/partners/bookings/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

function getHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function GET(req: Request) {
  try {
    const authHeader = getHeader(req);
    if (!authHeader)
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match)
      return NextResponse.json(
        { error: "Invalid Authorization header" },
        { status: 401 }
      );

    const token = match[1];
    let decoded: any;

    try {
      decoded = await adminAuth.verifyIdToken(token, true);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const uid = decoded.uid;

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50);
    const page = Math.max(parseInt(url.searchParams.get("page") || "1"), 1);

    const offset = (page - 1) * limit;

    const collectionRef = adminDb
      .collection("bookings")
      .where("partnerUid", "==", uid)
      .orderBy("createdAt", "desc");

    // Firestore offset pagination (OK for small datasets)
    const snap = await collectionRef.offset(offset).limit(limit).get();

    const data = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({
      ok: true,
      page,
      limit,
      count: data.length,
      bookings: data,
    });
  } catch (err: any) {
    console.error("bookings pagination error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
