// app/api/partners/kyc/submit/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // Parse JSON
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { token, idType, idNumberMasked, documents } = body;

    if (!token || !idType || !documents || !Array.isArray(documents)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify Firebase token
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
        { error: "Partner profile not found" },
        { status: 404 }
      );
    }

    // Validate documents array
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

    // Save under partner/{uid}/kyc
    await partnerRef.collection("kyc").doc("latest").set(
      {
        idType,
        idNumberMasked,
        documents: cleanedDocs,
        submittedAt: new Date().toISOString(),
        status: "submitted",
      },
      { merge: true }
    );

    // Update main partner record
    await partnerRef.update({
      kycStatus: "submitted",
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: "KYC submitted successfully",
    });
  } catch (err: any) {
    console.error("🔥 KYC submit error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
