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
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace("Bearer ", "").trim();

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

    /* ✅ PAGINATION */
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 100);
    const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
    const offset = (page - 1) * limit;

    /* ✅ ✅ ✅ ✅ FINAL FIX HERE ✅ ✅ ✅ ✅ */
    const collectionRef = adminDb
      .collection("listings")
      .where("metadata.partnerId", "==", uid)   // ✅ OPTION B FIX
      .orderBy("createdAt", "desc");

    const snap = await collectionRef.offset(offset).limit(limit).get();

    const listings = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() || {}),
    }));

    return NextResponse.json({
      ok: true,
      page,
      limit,
      total: listings.length,
      listings,
    });
  } catch (err: any) {
    console.error("❌ list listings error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
