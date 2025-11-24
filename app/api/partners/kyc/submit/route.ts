// app/api/partners/kyc/submit/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // ------------------------
    // 1) Parse JSON
    // ------------------------
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { token, idType, idNumberMasked, documents } = body;

    if (!token || !idType || !documents || !Array.isArray(documents)) {
      return NextResponse.json(
        { error: "Missing token, idType, documents[]" },
        { status: 400 }
      );
    }

    // ------------------------
    // 2) Authenticate user
    // ------------------------
    const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // ------------------------
    // 3) Check Partner existence
    // ------------------------
    const partnerRef = adminDb.collection("partners").doc(uid);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json(
        {
          error: "Partner profile not found. Complete onboarding first.",
        },
        { status: 404 }
      );
    }

    const partner = partnerSnap.data() || {};

    // Prevent resubmission while under review
    if (partner.kycStatus === "UNDER_REVIEW") {
      return NextResponse.json(
        { error: "KYC already submitted. Awaiting approval." },
        { status: 409 }
      );
    }

    // ------------------------
    // 4) Validate documents
    // ------------------------
    const cleanedDocs = documents.map((doc: any) => {
      if (!doc.docType || !doc.storagePath) {
        throw new Error("Each document must include docType & storagePath");
      }
      return {
        docType: doc.docType,
        storagePath: doc.storagePath,
        uploadedAt: new Date(),
      };
    });

    // ------------------------
    // 5) Create KYC record
    // ------------------------
    const kycDocRef = partnerRef.collection("kycDocs").doc();
    const kycId = kycDocRef.id;

    await kycDocRef.set({
      idType: idType.toUpperCase(),
      idNumberMasked: idNumberMasked || null,
      documents: cleanedDocs,
      status: "PENDING", // KYC waiting for admin approval
      submittedAt: new Date(),
    });

    // ------------------------
    // 6) Update partner root doc
    // ------------------------
    await partnerRef.set(
      {
        kycStatus: "UNDER_REVIEW",
        kycLastSubmitted: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // ------------------------
    // 7) Add audit log
    // ------------------------
    await partnerRef.collection("kycAudit").add({
      action: "submitted",
      kycId,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      kycId,
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
