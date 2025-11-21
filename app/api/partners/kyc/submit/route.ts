// app/api/partners/kyc/submit/route.ts
// ✔ Fully rewritten to match new onboarding + KYC flow
// ✔ Stores KYC ONLY inside partners/{uid}
// ✔ Sets kycStatus = "UNDER_REVIEW"
// ✔ Removes wrong "submitted" status and wrong nested collection usage
// ✔ Ensures clean, unified partner record

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // Parse body
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { token, idType, idNumberMasked, documents } = body;

    if (!token || !idType || !documents || !Array.isArray(documents)) {
      return NextResponse.json(
        { error: "Missing required fields: token, idType, documents[]" },
        { status: 400 }
      );
    }

    // Verify the Firebase ID token
    const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // Partner reference
    const partnerRef = adminDb.collection("partners").doc(uid);
    const snap = await partnerRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Partner profile not found. Please complete onboarding first." },
        { status: 404 }
      );
    }

    // Validate documents
    const cleanedDocs = documents.map((doc: any) => {
      if (!doc.docType || !doc.storagePath) {
        throw new Error("Each document must include docType & storagePath");
      }
      return {
        docType: doc.docType,
        storagePath: doc.storagePath,
        uploadedAt: new Date().toISOString(),
      };
    });

    // DIRECT write inside partners/{uid} (no nested collection needed)
    await partnerRef.set(
      {
        kycStatus: "UNDER_REVIEW", // <-- CORRECT new status
        kyc: {
          idType,
          idNumberMasked,
          documents: cleanedDocs,
          submittedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: "KYC submitted successfully and is now under review.",
    });
  } catch (err: any) {
    console.error("🔥 KYC submit error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
