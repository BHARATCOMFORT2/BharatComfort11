// app/api/partners/kyc/submit/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // ---------------------------------------------------------
    // 1. Parse incoming JSON body
    // ---------------------------------------------------------
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const {
      token,
      idType,
      idNumberMasked,
      documents,
      businessName,
      phone,
      address,
      gstNumber, // optional
    } = body;

    if (!token || !idType || !idNumberMasked || !documents) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: token, idType, idNumberMasked, documents[]",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { error: "Documents[] must contain at least one file reference" },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 2. Verify Firebase ID Token
    // ---------------------------------------------------------
    const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const uid = decoded.uid;

    // ---------------------------------------------------------
    // 3. Ensure partner exists
    // ---------------------------------------------------------
    const partnerRef = adminDb.collection("partners").doc(uid);
    const snap = await partnerRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Partner profile not found. Complete onboarding first." },
        { status: 404 }
      );
    }

    // ---------------------------------------------------------
    // 4. Clean document objects
    // ---------------------------------------------------------
    const cleaned = documents.map((doc: any) => {
      if (!doc.docType || !doc.storagePath) {
        throw new Error("Each document must include docType & storagePath");
      }
      return {
        docType: doc.docType,
        storagePath: doc.storagePath,
        uploadedAt: new Date(),
      };
    });

    // ---------------------------------------------------------
    // 5. Create new KYC Submission
    // ---------------------------------------------------------
    const kycRef = partnerRef.collection("kycDocs").doc();
    const kycId = kycRef.id;

    await kycRef.set({
      idType,
      idNumberMasked,
      documents: cleaned,
      businessName: businessName || null,
      gstNumber: gstNumber || null,
      address: address || null,
      phone: phone || null,
      status: "UNDER_REVIEW",
      submittedAt: new Date(),
    });

    // ---------------------------------------------------------
    // 6. Update partner main profile
    // ---------------------------------------------------------
    await partnerRef.set(
      {
        businessName: businessName || snap.data()?.businessName || null,
        phone: phone || snap.data()?.phone || null,
        address: address || snap.data()?.address || null,
        gstNumber: gstNumber || snap.data()?.gstNumber || null,
        kycStatus: "UNDER_REVIEW",
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // ---------------------------------------------------------
    // 7. Add KYC audit log entry
    // ---------------------------------------------------------
    await partnerRef.collection("kycAudit").add({
      action: "submitted",
      kycId,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      kycId,
      message: "KYC submitted successfully. Status updated to UNDER_REVIEW.",
    });
  } catch (err: any) {
    console.error("🔥 KYC Submit Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
