// app/api/partners/kyc/submit/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // -----------------------------------------------------
    // 1. PARSE JSON BODY
    // -----------------------------------------------------
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // Extract fields
    const {
      token,
      idType,
      idNumberMasked,
      documents,
      meta = {}, // ← KYC frontend sends "meta"
    } = body;

    const {
      businessName = null,
      phone = null,
      address = null,
      gstNumber = null,
    } = meta;

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

    // -----------------------------------------------------
    // 2. VERIFY AUTHENTICATION
    //    Support BOTH:
    //    - Firebase ID Token
    //    - Session Cookie
    // -----------------------------------------------------
    let uid: string | null = null;

    // Try ID token first
    const decodedByToken = await adminAuth.verifyIdToken(token).catch(() => null);
    if (decodedByToken) uid = decodedByToken.uid;

    // Try session cookie if token failed
    if (!uid) {
      const sessionCookie = cookies().get("__session")?.value || "";
      if (sessionCookie) {
        const decoded = await adminAuth.verifySessionCookie(sessionCookie, true).catch(() => null);
        uid = decoded?.uid || null;
      }
    }

    if (!uid) {
      return NextResponse.json({ error: "Unauthorized: invalid token" }, { status: 401 });
    }

    // -----------------------------------------------------
    // 3. VALIDATE PARTNER ACCOUNT
    // -----------------------------------------------------
    const partnerRef = adminDb.collection("partners").doc(uid);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json(
        { error: "Partner profile not found. Complete onboarding first." },
        { status: 404 }
      );
    }

    const partnerData = partnerSnap.data();
    if ((partnerData.role || "").toLowerCase() !== "partner") {
      return NextResponse.json(
        { error: "User is not a partner" },
        { status: 403 }
      );
    }

    // -----------------------------------------------------
    // 4. CLEAN DOCUMENT OBJECTS
    // -----------------------------------------------------
    const cleanedDocs = documents.map((doc: any) => {
      if (!doc.docType || !doc.storagePath) {
        throw new Error("Each document must include docType & storagePath");
      }
      return {
        docType: doc.docType,
        storagePath: doc.storagePath,
        uploadedAt: FieldValue.serverTimestamp(),
      };
    });

    // -----------------------------------------------------
    // 5. CREATE NEW KYC ENTRY
    // -----------------------------------------------------
    const kycRef = partnerRef.collection("kycDocs").doc();
    const kycId = kycRef.id;

    await kycRef.set({
      idType,
      idNumberMasked,
      documents: cleanedDocs,
      businessName,
      address,
      phone,
      gstNumber,
      status: "UNDER_REVIEW",
      submittedAt: FieldValue.serverTimestamp(),
    });

    // -----------------------------------------------------
    // 6. UPDATE MAIN PARTNER PROFILE
    // -----------------------------------------------------
    await partnerRef.set(
      {
        businessName,
        phone,
        address,
        gstNumber,
        kycStatus: "UNDER_REVIEW",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // -----------------------------------------------------
    // 7. AUDIT LOG
    // -----------------------------------------------------
    await partnerRef.collection("kycAudit").add({
      action: "submitted",
      kycId,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      kycId,
      message: "KYC submitted successfully. Status updated to UNDER_REVIEW.",
    });
  } catch (err: any) {
    console.error("🔥 KYC Submit API Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
