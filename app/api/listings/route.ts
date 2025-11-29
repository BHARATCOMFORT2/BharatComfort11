// app/api/listings/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // -----------------------------------
    // ✅ AUTH (Session Cookie)
    // -----------------------------------
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("__session="))
        ?.split("=")[1] || "";

    let decoded: any = null;

    if (sessionCookie) {
      decoded = await adminAuth
        .verifySessionCookie(sessionCookie, true)
        .catch(() => null);
    }

    // NOTE: Public users ke liye session optional hai
    const uid = decoded?.uid || null;
    const role =
      decoded?.role || decoded?.admin
        ? "admin"
        : decoded?.partner
        ? "partner"
        : "user";

    // -----------------------------------
    // ✅ ROLE BASED QUERY
    // -----------------------------------
    let queryRef = adminDb.collection("listings");

    if (role === "admin") {
      // ✅ Admin: ALL listings (no filter)
      queryRef = queryRef.orderBy("createdAt", "desc");

    } else if (role === "partner" && uid) {
      // ✅ Partner: ONLY own listings
      queryRef = queryRef
        .where("partnerUid", "==", uid)
        .orderBy("createdAt", "desc");

    } else {
      // ✅ Public User: ONLY active listings
      queryRef = queryRef
        .where("status", "==", "ACTIVE")
        .orderBy("createdAt", "desc");
    }

    const snap = await queryRef.get();

    const listings = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({
      success: true,
      role,
      count: listings.length,
      listings,
    });
  } catch (err: any) {
    console.error("Unified Listings API Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
