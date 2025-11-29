// app/api/listings/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // -----------------------------------
    // ✅ AUTH (OPTIONAL FOR PUBLIC)
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

    const uid = decoded?.uid || null;

    // ✅ ✅ ✅ FIXED ROLE LOGIC
    let role: "admin" | "partner" | "user" = "user";
    if (decoded?.admin === true) role = "admin";
    else if (decoded?.partner === true) role = "partner";

    // -----------------------------------
    // ✅ ✅ ✅ SAFE QUERY (NO INDEX ERROR)
    // -----------------------------------
    let queryRef = adminDb.collection("listings");

    if (role === "partner" && uid) {
      queryRef = queryRef.where("partnerUid", "==", uid);
    } 
    
    else if (role === "user") {
      // ✅ PUBLIC USERS → ONLY ACTIVE
      queryRef = queryRef.where("status", "==", "ACTIVE");
    }

    // ✅ ✅ ✅ ORDER AFTER FILTER (SAFE)
    const snap = await queryRef.orderBy("createdAt", "desc").get();

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
    console.error("✅ Listings API Fixed Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
