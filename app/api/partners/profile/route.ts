// app/api/partners/profile/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // -------------------------------
    // 1) Extract Firebase SESSION cookie (FIXED)
    // -------------------------------
    const sessionCookie = cookies().get("__session")?.value || "";

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated (no session)" },
        { status: 401 }
      );
    }

    // -------------------------------
    // 2) Verify session cookie
    // -------------------------------
    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // -------------------------------
    // 3) Fetch partner main document
    // -------------------------------
    const partnerRef = adminDb.collection("partners").doc(uid);
    const snap = await partnerRef.get();

    if (!snap.exists) {
      return NextResponse.json({
        ok: true,
        exists: false,
        uid,
        partner: null,
        onboardingStatus: "NOT_CREATED",
        kycStatus: "NOT_STARTED",
        latestKyc: null,
        claims: {
          partner: decoded.partner || false,
          admin: decoded.admin || false,
        },
      });
    }

    const partner = snap.data() || {};
    let onboardingStatus = partner.status || "PENDING_ONBOARDING";

    // -------------------------------
    // 4) Fetch latest KYC submission
    // -------------------------------
    const kycDocsSnap = await partnerRef
      .collection("kycDocs")
      .orderBy("submittedAt", "desc")
      .limit(1)
      .get();

    let latestKyc = null;
    let kycStatus = "NOT_STARTED";

    if (!kycDocsSnap.empty) {
      const doc = kycDocsSnap.docs[0];
      latestKyc = { kycId: doc.id, ...doc.data() };

      const raw =
        latestKyc.status ||
        partner.kycStatus ||
        "SUBMITTED";

      kycStatus = raw.toString().toUpperCase();
    } else {
      kycStatus = partner.kycStatus
        ? partner.kycStatus.toString().toUpperCase()
        : "NOT_STARTED";
    }

    return NextResponse.json({
      ok: true,
      exists: true,
      uid,
      partner: {
        uid,
        name: partner.name || null,
        email: partner.email || null,
        phone: partner.phone || null,
        businessName: partner.businessName || null,
        address: partner.address || null,
        status: onboardingStatus,
        kycStatus,
      },
      onboardingStatus,
      kycStatus,
      latestKyc,
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
