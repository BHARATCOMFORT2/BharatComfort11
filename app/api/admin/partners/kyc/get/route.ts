// app/api/admin/partners/kyc/get/route.ts

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

    // 2) Read URL query parameters
    const url = new URL(req.url);
    const partnerUid = url.searchParams.get("partnerUid");
    const kycId = url.searchParams.get("kycId");

    if (!partnerUid) {
      return NextResponse.json(
        { error: "Missing partnerUid" },
        { status: 400 }
      );
    }

    // 3) Fetch partner profile
    const partnerRef = adminDb.collection("partners").doc(partnerUid);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const partnerData = partnerSnap.data() || {};

    // 4) Fetch KYC document(s)
    let kycDocSnap: FirebaseFirestore.DocumentSnapshot;

    // If a specific KYC ID is provided
    if (kycId) {
      kycDocSnap = await partnerRef.collection("kycDocs").doc(kycId).get();
      if (!kycDocSnap.exists) {
        return NextResponse.json(
          { error: "KYC record not found" },
          { status: 404 }
        );
      }
    } else {
      // If no specific ID, fetch the latest KYC record
      const kycListSnap = await partnerRef
        .collection("kycDocs")
        .orderBy("submittedAt", "desc")
        .limit(1)
        .get();

      if (kycListSnap.empty) {
        return NextResponse.json(
          { error: "No KYC submissions found" },
          { status: 404 }
        );
      }

      kycDocSnap = kycListSnap.docs[0];
    }

    const kycData = kycDocSnap.data() || {};

    // 5) Return combined KYC + Partner data
    return NextResponse.json({
      ok: true,
      partnerUid,
      kycId: kycDocSnap.id,
      partner: {
        displayName: partnerData.displayName || null,
        businessName: partnerData.businessName || null,
        email: partnerData.email || null,
        phone: partnerData.phone || null,
        status: partnerData.status || null,
      },
      kyc: {
        idType: kycData.idType || null,
        idNumberMasked: kycData.idNumberMasked || null,
        documents: kycData.documents || [],
        submittedAt: kycData.submittedAt || null,
        status: kycData.status || "submitted",
        rejectedReason: kycData.rejectedReason || null,
      },
    });
  } catch (err: any) {
    console.error("Admin KYC get error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
