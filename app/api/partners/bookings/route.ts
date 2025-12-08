// app/api/partners/bookings/route.ts

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

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(token, true);
    } catch (err) {
      console.error("❌ Token verify failed:", err);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    /* ---------------- PAGINATION ---------------- */

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "10"), 50);
    const page = Math.max(Number(url.searchParams.get("page") || "1"), 1);
    const offset = (page - 1) * limit;

    /* ---------------- ✅ FIXED FIRESTORE QUERY ---------------- */

    const collectionRef = adminDb
      .collection("bookings")
      .where("partnerId", "==", uid)   // ✅ FIXED FIELD NAME
      .orderBy("createdAt", "desc");

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
    console.error("❌ bookings pagination error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
