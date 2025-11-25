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
    // 1) Extract Session Cookie
    // -------------------------------
    const sessionCookie = cookies().get("__session")?.value || "";
    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // -------------------------------
    // 2) Verify Cookie
    // -------------------------------
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true).catch(() => null);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const uid = decoded.uid;

    // -------------------------------
    // 3) Fetch USER Document
    // -------------------------------
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const userData = userSnap.exists ? userSnap.data() : {};

    const role = userData.role || "user";

    if (role !== "partner") {
      return NextResponse.json(
        { error: "User is not a partner", role },
        { status: 403 }
      );
    }

    // -------------------------------
    // 4) Fetch Partner Main Document
    // -------------------------------
    const partnerRef = adminDb.collection("partners").doc(uid);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json({
        ok: true,
        exists: false,
        uid,
        role: "partner",
        onboardingStatus: "NOT_CREATED",
        kycStatus: "NOT_STARTED",
        latestKyc: null,
        partner: null,
      });
    }

    const partner = partnerSnap.data();

    // Partner status
    let onboardingStatus = partner.status || "PENDING_ONBOARDING";

    // -------------------------------
    // 5) Fetch Latest KYC Entry
    // -------------------------------
    const kycDocsSnap = await partnerRef
      .collection("kycDocs")
      .orderBy("submittedAt", "desc")
      .limit(1)
      .get();

    let latestKyc = null;
    let kycStatus = partner.kycStatus || "NOT_STARTED";

    if (!kycDocsSnap.empty) {
      const doc = kycDocsSnap.docs[0];
      latestKyc = { kycId: doc.id, ...doc.data() };
      kycStatus = (latestKyc.status || "SUBMITTED").toUpperCase();
    }

    // Normalize KYC flags
    if (kycStatus === "APPROVED") onboardingStatus = "APPROVED";
    if (kycStatus === "REJECTED") onboardingStatus = "REJECTED";
    if (kycStatus === "UNDER_REVIEW") onboardingStatus = "UNDER_REVIEW";

    // -------------------------------
    // 6) Respond with Correct Data
    // -------------------------------
    return NextResponse.json({
      ok: true,
      uid,
      role: "partner",
      onboardingStatus,
      kycStatus,
      partner: {
        uid,
        ...partner,
        status: onboardingStatus,
        kycStatus,
      },
      latestKyc,
      claims: {
        partner: true, // FIXED
        admin: !!decoded.admin,
      },
    });
  } catch (err: any) {
    console.error("Partner profile error:", err);
    return NextResponse.json({ error: err.message || "Server Error" }, { status: 500 });
  }
}
