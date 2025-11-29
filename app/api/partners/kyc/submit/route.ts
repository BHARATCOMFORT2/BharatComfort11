// app/api/partners/kyc/submit/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * ✅ Partner KYC Submit / Resubmit
 *
 * Accepts body (two shapes supported):
 *
 * 1) From main KYC page:
 * {
 *   token?: string;
 *   idType: "AADHAAR";
 *   idNumberMasked: string;
 *   documents: { docType: string; storagePath: string }[];
 *   meta: {
 *     gstNumber?: string | null;
 *     businessName: string;
 *     phone: string;
 *     address: {
 *       line1: string;
 *       line2?: string;
 *       city: string;
 *       state: string;
 *       pincode: string;
 *     };
 *   };
 * }
 *
 * 2) From resubmit page:
 * {
 *   isResubmission: true;
 *   businessName: string;
 *   phone: string;
 *   aadhaar: string;
 *   gstNumber?: string | null;
 *   documents: { docType: string; storagePath: string }[];
 * }
 */

export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin } = getFirebaseAdmin();

    // -----------------------------------
    // 1) Auth: Try session cookie, fallback to ID token
    // -----------------------------------
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("__session="))
        ?.split("=")[1] || "";

    const body = await req.json().catch(() => ({} as any));
    const idToken: string | undefined = body?.token;

    let decoded: any = null;

    if (sessionCookie) {
      decoded = await adminAuth
        .verifySessionCookie(sessionCookie, true)
        .catch(() => null);
    }

    if (!decoded && idToken) {
      decoded = await adminAuth
        .verifyIdToken(idToken)
        .catch(() => null);
    }

    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;
    const now = admin.firestore.FieldValue.serverTimestamp();

    // -----------------------------------
    // 2) Parse & normalize input
    // -----------------------------------
    const isResubmission: boolean = !!body?.isResubmission;

    // Documents array
    const documents: { docType: string; storagePath: string }[] = Array.isArray(
      body?.documents
    )
      ? body.documents.filter(
          (d: any) => d && d.docType && d.storagePath
        )
      : [];

    // Base fields (from both shapes)
    let businessName: string | null = null;
    let phone: string | null = null;
    let gstNumber: string | null = null;
    let address: any = null;
    let idType: string = "AADHAAR";
    let idNumberMasked: string | null = null;
    let aadhaarLast4: string | null = null;

    if (body?.meta) {
      // Shape 1 (main KYC)
      const meta = body.meta;
      businessName = meta.businessName?.toString().trim() || null;
      phone = meta.phone?.toString().trim() || null;
      gstNumber =
        meta.gstNumber && meta.gstNumber.toString().trim()
          ? meta.gstNumber.toString().trim()
          : null;
      address = meta.address || null;
      idType = body.idType || "AADHAAR";
      idNumberMasked = body.idNumberMasked || null;

      // Try to extract last4 from masked (e.g. 1234XXXX5678)
      if (idNumberMasked && idNumberMasked.length >= 4) {
        aadhaarLast4 = idNumberMasked.slice(-4);
      }
    } else {
      // Shape 2 (resubmit)
      businessName = body.businessName?.toString().trim() || null;
      phone = body.phone?.toString().trim() || null;
      gstNumber =
        body.gstNumber && body.gstNumber.toString().trim()
          ? body.gstNumber.toString().trim()
          : null;

      const aadhaarRaw = body.aadhaar?.toString().trim() || "";
      if (aadhaarRaw) {
        const cleaned = aadhaarRaw.replace(/\D+/g, "");
        if (cleaned.length >= 4) {
          aadhaarLast4 = cleaned.slice(-4);
          idNumberMasked = `XXXXXXXX${aadhaarLast4}`;
        }
      }
    }

    if (!businessName || !phone) {
      return NextResponse.json(
        { success: false, error: "Business name and phone are required" },
        { status: 400 }
      );
    }

    if (!aadhaarLast4) {
      // Aadhaar is mandatory for this flow
      return NextResponse.json(
        { success: false, error: "Aadhaar details are required" },
        { status: 400 }
      );
    }

    // -----------------------------------
    // 3) Partner doc reference
    // -----------------------------------
    const partnerRef = adminDb.collection("partners").doc(uid);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      // Minimal partner doc create
      await partnerRef.set(
        {
          uid,
          businessName,
          phone,
          gstNumber,
          address: address || null,
          createdAt: now,
          updatedAt: now,
          status: "PENDING_KYC",
          kycStatus: "UNDER_REVIEW",
        },
        { merge: true }
      );
    }

    // -----------------------------------
    // 4) Build KYC payload
    // -----------------------------------
    const kycPayload = {
      status: "UNDER_REVIEW",
      idType,
      idNumberMasked: idNumberMasked || null,
      aadhaarLast4,
      gstNumber,
      documents: documents || [],
      isResubmission,
      submittedAt: now,
    };

    // -----------------------------------
    // 5) Update Partner Document
    // -----------------------------------
    await partnerRef.set(
      {
        uid,
        businessName,
        phone,
        gstNumber,
        address: address || admin.firestore.FieldValue.delete(),
        kycStatus: "UNDER_REVIEW",
        kyc: kycPayload,
        status: "PENDING_KYC",
        kycSubmittedAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

    // -----------------------------------
    // 6) Optional: audit trail
    // -----------------------------------
    await adminDb.collection("kycAudit").add({
      uid,
      type: isResubmission ? "RESUBMIT" : "SUBMIT",
      kycStatus: "UNDER_REVIEW",
      businessName,
      phone,
      gstNumber,
      aadhaarLast4,
      documents,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      message: isResubmission
        ? "KYC resubmitted successfully"
        : "KYC submitted successfully",
    });
  } catch (err: any) {
    console.error("Partner KYC Submit Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
