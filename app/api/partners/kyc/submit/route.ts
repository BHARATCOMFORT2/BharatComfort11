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

    if (!token || !idType || !documents || !Array.isArray(documents)) {
      return NextResponse.json(
        { error: "Missing token, idType, documents[]" },
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
        { error: "Partner profile not found. Complete onboarding first." },
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

    // -----------------------------
    // 🔥 CREATE KYC RECORD IN SUBCOLLECTION
    // -----------------------------
    const kycDocRef = partnerRef.collection("kycDocs").doc();
    const kycId = kycDocRef.id;

    await kycDocRef.set({
      idType,
      idNumberMasked,
      documents: cleanedDocs,
      status: "pending",
      submittedAt: new Date(),
    });

    // -----------------------------
    // 🔥 UPDATE PARTNER ROOT STATUS
    // -----------------------------
    await partnerRef.set(
      {
        kycStatus: "pending",
        kycLastSubmitted: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // -----------------------------
    // 🔥 AUDIT LOG
    // -----------------------------
    await partnerRef.collection("kycAudit").add({
      action: "submitted",
      kycId,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      kycId,
      message: "KYC submitted successfully and is now pending review.",
    });
  } catch (err: any) {
    console.error("🔥 KYC submit error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
