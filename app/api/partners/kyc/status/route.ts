// app/api/partners/kyc/status/route.ts
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

    // -------------------------
    // 1) Validate Authorization
    // -------------------------
    const authHeader = getAuthHeader(req);
    if (!authHeader)
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match)
      return NextResponse.json(
        { error: "Malformed Authorization header" },
        { status: 401 }
      );

    const token = match[1];

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // -------------------------
    // 2) Fetch partner record
    // -------------------------
    const partnerRef = adminDb.collection("partners").doc(uid);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json({
        ok: false,
        status: "not_created",
        message: "Partner profile does not exist",
      });
    }

    const partner = partnerSnap.data();
    const kycStatus = partner.kycStatus || "not_created";
    let reason = partner.kycRejectedReason || null;

    // -------------------------
    // 3) Fetch latest KYC doc
    // -------------------------
    const kycDocsSnap = await partnerRef
      .collection("kycDocs")
      .orderBy("submittedAt", "desc")
      .limit(1)
      .get();

    if (kycDocsSnap.empty) {
      return NextResponse.json({
        ok: true,
        status: "not_created",
        partner: null,
      });
    }

    const kycDoc = kycDocsSnap.docs[0];
    const kycData = kycDoc.data();

    // If rejected, attach last rejection reason
    if (kycData.status === "rejected" && kycData.rejectedReason) {
      reason = kycData.rejectedReason;
    }

    return NextResponse.json({
      ok: true,
      status: kycStatus,
      partner: {
        ...partner,
        reason,
      },
      kyc: {
        id: kycDoc.id,
        ...kycData,
      },
    });
  } catch (err: any) {
    console.error("KYC status error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
