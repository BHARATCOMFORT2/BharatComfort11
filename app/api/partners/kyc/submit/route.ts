// app/api/partners/kyc/submit/route.ts

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { token, idType, idNumberMasked, documents } = body;

    if (!token || !idType) {
      return NextResponse.json(
        { error: "Missing token or idType" },
        { status: 400 }
      );
    }

    // ---------------------------------------
    // 🚫 CRITICAL FIX 1 — documents must exist
    // ---------------------------------------
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { error: "No KYC documents uploaded. Submit at least 1 document." },
        { status: 400 }
      );
    }

    // Verify partner auth
    const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;
    const partnerRef = adminDb.collection("partners").doc(uid);

    const partnerSnap = await partnerRef.get();
    if (!partnerSnap.exists) {
      return NextResponse.json(
        { error: "Partner profile not found" },
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
        uploadedAt: new Date(),
      };
    });

    // ---------------------------------------
    // 🔥 CREATE NEW KYC DOC
    // ---------------------------------------
    const kycRef = partnerRef.collection("kycDocs").doc();
    const kycId = kycRef.id;

    await kycRef.set({
      idType,
      idNumberMasked,
      documents: cleanedDocs,
      status: "SUBMITTED",
      submittedAt: new Date(),
    });

    // ---------------------------------------
    // 🔥 UPDATE PARTNER ROOT KYC STATUS
    // ---------------------------------------
    await partnerRef.set(
      {
        kycStatus: "SUBMITTED",
        kycLastSubmitted: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // ---------------------------------------
    // 🔥 AUDIT LOG
    // ---------------------------------------
    await partnerRef.collection("kycAudit").add({
      action: "submitted",
      kycId,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      kycId,
      message: "KYC submitted successfully.",
    });
  } catch (err: any) {
    console.error("🔥 KYC submit error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
