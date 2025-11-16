// app/api/partners/kyc/submit/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// Extract Authorization header
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    const { adminDb, adminAuth } = getFirebaseAdmin();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { idType, idNumberMasked, documents } = body;

    if (!idType || !documents || !Array.isArray(documents)) {
      return NextResponse.json(
        { error: "Missing KYC fields" },
        { status: 400 }
      );
    }

    // 1) Verify Authorization
    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );
    }

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "Malformed Authorization header" },
        { status: 401 }
      );
    }

    const idToken = match[1];
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // 2) Verify Partner Exists
    const partnerRef = adminDb.collection("partners").doc(uid);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json(
        { error: "Partner profile not found" },
        { status: 404 }
      );
    }

    // 3) Validate documents
    const finalDocuments = [];

    for (const doc of documents) {
      const { name, url, storagePath } = doc;

      if (!name || !url || !storagePath) {
        return NextResponse.json(
          { error: "Each document must include name, url, storagePath" },
          { status: 400 }
        );
      }

      finalDocuments.push({
        name,
        url,
        storagePath,
        uploadedAt: new Date(),
      });
    }

    // 4) Create KYC record
    await partnerRef.collection("kycDocs").add({
      idType,
      idNumberMasked,
      documents: finalDocuments,
      submittedAt: new Date(),
      status: "kyc_pending",
    });

    // 5) Update partner KYC status
    await partnerRef.update({
      kycStatus: "kyc_pending",
      kycLastSubmittedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      message: "KYC submitted successfully",
    });
  } catch (err: any) {
    console.error("KYC submit error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
