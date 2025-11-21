// app/api/partners/profile/route.ts (FULLY FIXED)
// ✔ No more wrong "under review" before KYC
// ✔ Returns clean and correct onboarding state
// ✔ Reads partner from partners/{uid} only
// ✔ Matches new KYC flow: NOT_STARTED / UNDER_REVIEW / APPROVED / REJECTED
// ✔ Never forces wrong redirect

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // -------------------------------
    // 1) Extract session cookie
    // -------------------------------
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split(";")
        .find((c) => c.trim().startsWith("__session="))
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // -------------------------------
    // 2) Verify cookie
    // -------------------------------
    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // -------------------------------
    // 3) Fetch partner record
    // -------------------------------
    const snap = await adminDb.collection("partners").doc(uid).get();

    if (!snap.exists) {
      return NextResponse.json({
        ok: true,
        exists: false,
        uid,
        partner: null,
        kycStatus: "NOT_STARTED", // clean default
        onboardingStatus: "NOT_CREATED",
      });
    }

    const partner = snap.data();

    // Normalized fields
    const kycStatus = partner.kycStatus || "NOT_STARTED";
    const onboardingStatus = partner.status || "PENDING_ONBOARDING";

    return NextResponse.json({
      ok: true,
      exists: true,
      uid,
      partner: {
        uid: partner.uid,
        name: partner.name,
        email: partner.email,
        phone: partner.phone,
        kycStatus,
        onboardingStatus,
      },
      kycStatus,
      onboardingStatus,
      claims: {
        partner: decoded.partner || false,
        admin: decoded.admin || false,
      },
    });
  } catch (err: any) {
    console.error("Partner profile error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
