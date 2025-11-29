// app/api/partners/listings/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // -------------------------------
    // ✅ AUTH VIA SESSION COOKIE
    // -------------------------------
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("__session="))
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // -------------------------------
    // ✅ FETCH PARTNER LISTINGS
    // -------------------------------
    const snap = await adminDb
      .collection("listings")
      .where("partnerUid", "==", uid)
      .orderBy("createdAt", "desc")
      .get();

    const listings = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({
      success: true,
      listings,
    });
  } catch (err: any) {
    console.error("Partner Listings API Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
