// app/api/partners/kyc/submit/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // ---------------------------------------------------------
    // 1. Parse request body
    // ---------------------------------------------------------
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { token, idType, idNumberMasked, documents } = body;

    if (!token || !idType || !documents || !Array.isArray(documents)) {
      return NextResponse.json(
        { error: "Missing fields: token, idType, documents[]" },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 2. Verify Firebase ID token
    // ---------------------------------------------------------
    const decoded = await adminAuth.verifyIdToken(token).catch(() => null);

    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // ---------------------------------------------------------
    // 3. Ensure partner exists
    // ---------------------------------------------------------
    const partnerRef = adminDb.collection("partners").doc(uid);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json(
        { error: "Partner profile not found" },
        { status: 404 }
      );
    }

    // ---------------------------------------------------------
    // 4. Validate documents
    // ---------------------------------------------------------
    const cleanedDocs = documents.map((doc: any) => {
      if (!doc.docType || !doc.storagePath) {
        throw new Error("Each document must have docType & storagePath");
      }
      return {
        docType: doc.docType,
        storagePath: doc.storagePath,
        uploadedAt: new Date(),
      };
    });

    // ---------------------------------------------------------
    // 5. Create KYC submission (subcollection)
    // ---------------------------------------------------------
    const kycRef = partnerRef.collection("kycDocs").doc();
    const kycId = kycRef.id;

    await kycRef.set({
      idType,
      idNumberMasked: idNumberMasked || null,
      documents: cleanedDocs,
      status: "UNDER_REVIEW",   // 🔥 Corrected (NOT PENDING)
      submittedAt: new Date(),
    });

    // ---------------------------------------------------------
    // 6. Update main partner profile
    // ---------------------------------------------------------
    await partnerRef.set(
      {
        kycStatus: "UNDER_REVIEW", // 🔥 Correct unified status
        kycLastSubmitted: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // ---------------------------------------------------------
    // 7. KYC Audit log
    // ---------------------------------------------------------
    await partnerRef.collection("kycAudit").add({
      action: "submitted",
      kycId,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "KYC submitted successfully. Status: UNDER_REVIEW",
      kycId,
    });
  } catch (err: any) {
    console.error("🔥 KYC Submit Error:", err);
    return NextResponse.json(
      {
        error: err.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
