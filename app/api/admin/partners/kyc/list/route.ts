// app/api/admin/partners/kyc/list/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

// Extract Authorization header
function getAuthHeader(req: Request) {
  const auth = (req as any).headers?.get
    ? (req as any).headers.get("authorization")
    : (req as any).headers?.authorization;
  return auth || "";
}

export async function GET(req: Request) {
  try {
    // 1) Authenticate admin
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

    const idToken = match[1];
    let decoded: any;

    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    if (!decoded.admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // 2) Optional filter -> ?status=submitted
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status");

    // 3) Fetch all partners
    const partnersSnap = await adminDb.collection("partners").get();

    const results: any[] = [];

    for (const partnerDoc of partnersSnap.docs) {
      const partnerUid = partnerDoc.id;
      const partnerData = partnerDoc.data() || {};

      // Fetch subcollection kycDocs
      const kycDocsSnap = await adminDb
        .collection("partners")
        .doc(partnerUid)
        .collection("kycDocs")
        .orderBy("submittedAt", "desc")
        .get();

      if (kycDocsSnap.empty) continue;

      for (const doc of kycDocsSnap.docs) {
        const kyc = doc.data() || {};

        // Apply filter (optional)
        if (statusFilter && kyc.status !== statusFilter) continue;

        results.push({
          partnerUid,
          partner: {
            displayName: partnerData.displayName || null,
            businessName: partnerData.businessName || null,
            status: partnerData.status || null,
          },
          kycId: doc.id,
          kycType: kyc.idType || null,
          status: kyc.status || "submitted",
          submittedAt: kyc.submittedAt || null,
          documents: kyc.documents || [],
        });
      }
    }

    return NextResponse.json({
      ok: true,
      total: results.length,
      data: results,
    });
  } catch (err: any) {
    console.error("KYC list error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
