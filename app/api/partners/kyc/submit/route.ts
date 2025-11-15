// app/api/partners/kyc/submit/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebaseadmin";
import admin from "firebase-admin";

// Extract Authorization header
function getAuthHeader(req: Request) {
  const auth = (req as any).headers?.get
    ? (req as any).headers.get("authorization")
    : (req as any).headers?.authorization;
  return auth || "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { idType, idNumberMasked, documents, businessName } = body;

    if (!idType || !documents || !Array.isArray(documents)) {
      return NextResponse.json({ error: "Missing KYC fields" }, { status: 400 });
    }

    // 1) Verify identity token
    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
    }

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Malformed Authorization header" }, { status: 401 });
    }

    const idToken = match[1];
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch (error) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const uid = decoded.uid;

    // 2) Verify partner exists
    const partnerRef = adminDb.collection("partners").doc(uid);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json(
        { error: "Partner profile not found. Please create partner first." },
        { status: 404 }
      );
    }

    // 3) Upload documents to Firebase Storage
    const uploadedDocs = [];
    for (const doc of documents) {
      const { filename, base64, contentType } = doc;

      if (!filename || !base64) continue;

      const buffer = Buffer.from(base64, "base64");

      if (buffer.length > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large (>10MB)" }, { status: 400 });
      }

      const folder = `kyc/${uid}/${Date.now()}_${filename.replace(/\s+/g, "_")}`;
      const file = adminStorage.file(folder);

      await file.save(buffer, {
        metadata: {
          contentType: contentType || "application/octet-stream",
          metadata: {
            owner: uid,
          },
        },
        public: false,
        validation: "md5",
      });

      uploadedDocs.push({
        storagePath: folder,
        filename,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // 4) Add KYC submission record
    await partnerRef.collection("kycDocs").add({
      idType,
      idNumberMasked,
      documents: uploadedDocs,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "submitted",
    });

    // 5) Update partner status → kyc_pending
    await partnerRef.update({
      status: "kyc_pending",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      businessName: businessName || null,
    });

    return NextResponse.json({
      ok: true,
      message: "KYC submitted successfully",
      uploadedCount: uploadedDocs.length,
    });
  } catch (err: any) {
    console.error("KYC submit error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
