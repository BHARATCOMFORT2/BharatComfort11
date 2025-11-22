// app/api/partners/profile/route.ts
// ✔ Now returns partner core info
// ✔ Returns latest KYC submission + documents
// ✔ Returns correct onboarding + KYC states
// ✔ Protects session correctly
// ✔ Fixed missing partner.uid issue

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // -------------------------------
    // 1) Extract Firebase session cookie
    // -------------------------------
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("__session="))
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // -------------------------------
    // 2) Verify cookie
    // -------------------------------
    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const uid = decoded.uid;

    // -------------------------------
    // 3) Fetch partner core info
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
        kyc: null,
      });
    }

    const partner = snap.data() || {};

    // Normalize fields safely
    const onboardingStatus = partner.status || "PENDING_ONBOARDING";
    const kycStatus = partner.kycStatus || "NOT_STARTED";

    // -------------------------------
    // 4) Fetch latest KYC document entry
    // -------------------------------
    const kycDocsSnap = await partnerRef
      .collection("kycDocs")
      .orderBy("submittedAt", "desc")
      .limit(1)
      .get();

    let latestKyc: any = null;

    if (!kycDocsSnap.empty) {
      const doc = kycDocsSnap.docs[0];

      latestKyc = {
        kycId: doc.id,
        ...doc.data(),
      };
    }

    return NextResponse.json({
      ok: true,
      exists: true,
      uid,
      partner: {
        uid, // FIXED — always return correct uid
        name: partner.name || null,
        email: partner.email || null,
        phone: partner.phone || null,
        businessName: partner.businessName || null,
        address: partner.address || null,
        status: onboardingStatus,
        kycStatus,
      },
      kycStatus,
      onboardingStatus,
      latestKyc, // NEW → dashboard needs this!
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
