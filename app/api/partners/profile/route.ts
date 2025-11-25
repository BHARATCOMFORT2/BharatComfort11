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
    // 1) Try SESSION COOKIE first
    // -------------------------------
    let uid: string | null = null;

    const sessionCookie = cookies().get("__session")?.value || "";
    if (sessionCookie) {
      try {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
        uid = decoded.uid;
      } catch (e) {
        uid = null;
      }
    }

    // -------------------------------
    // 2) If no session-cookie → try Bearer token
    // -------------------------------
    if (!uid) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          uid = decoded.uid;
        } catch (e) {
          // still null
        }
      }
    }

    // Not authenticated at all
    if (!uid) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // -------------------------------
    // 3) Fetch USER Document
    // -------------------------------
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const userData = userSnap.exists ? userSnap.data() : {};
    const role = userData.role || "user";

    if (role !== "partner") {
      return NextResponse.json({ error: "User is not a partner", role }, { status: 403 });
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
    let onboardingStatus = partner.status || "PENDING_ONBOARDING";
    let kycStatus = partner.kycStatus || "NOT_STARTED";

    // -------------------------------
    // 5) Get latest KYC entry
    // -------------------------------
    const kycDocsSnap = await partnerRef
      .collection("kycDocs")
      .orderBy("submittedAt", "desc")
      .limit(1)
      .get();

    let latestKyc = null;
    if (!kycDocsSnap.empty) {
      const doc = kycDocsSnap.docs[0];
      latestKyc = { kycId: doc.id, ...doc.data() };
      kycStatus = (latestKyc.status || "SUBMITTED").toUpperCase();
    }

    if (kycStatus === "APPROVED") onboardingStatus = "APPROVED";
    if (kycStatus === "REJECTED") onboardingStatus = "REJECTED";
    if (kycStatus === "UNDER_REVIEW") onboardingStatus = "UNDER_REVIEW";

    // -------------------------------
    // 6) Respond
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
      claims: { partner: true },
    });
  } catch (err: any) {
    console.error("Partner profile error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
