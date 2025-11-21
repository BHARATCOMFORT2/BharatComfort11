// app/api/partners/kyc/status/route.ts
// ✔ Fully rewritten to match new KYC storage model
// ✔ Reads kycStatus directly from partners/{uid}
// ✔ Removes old nested kycDocs collection
// ✔ Handles NOT_STARTED, UNDER_REVIEW, APPROVED, REJECTED

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // 1) Authorization header check
    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
    }

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Malformed Authorization header" }, { status: 401 });
    }

    const token = match[1];

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const uid = decoded.uid;

    // 2) Fetch partner record
    const partnerRef = adminDb.collection("partners").doc(uid);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json({
        ok: false,
        status: "NOT_STARTED",
        message: "Partner profile does not exist",
      });
    }

    const partner = partnerSnap.data();

    // KYC status stored directly on partners/{uid}
    const kycStatus = partner.kycStatus || "NOT_STARTED";

    // 3) Return merged partner + kyc structure
    return NextResponse.json({
      ok: true,
      status: kycStatus,
      partner: {
        uid: partner.uid,
        name: partner.name,
        email: partner.email,
        phone: partner.phone,
        kycStatus,
        reason: partner.kycRejectedReason || null,
      },
      kyc: partner.kyc || null, // embedded KYC object from submit route
    });
  } catch (err: any) {
    console.error("KYC status error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
