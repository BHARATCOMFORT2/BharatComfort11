export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * ✅ Partner KYC Upload (JSON + Base64)
 * Expects:
 * {
 *   token: string,
 *   docType: "AADHAAR" | "GST" | string,
 *   fileBase64: "data:<mime>;base64,<data>"
 * }
 */
export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin, storage } = getFirebaseAdmin();
    const bucket = storage;

    // -----------------------------
    // 1️⃣ Parse JSON body
    // -----------------------------
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { token, docType, fileBase64 } = body;

    if (!token || !fileBase64) {
      return NextResponse.json(
        { success: false, error: "Missing token or file" },
        { status: 400 }
      );
    }

    // -----------------------------
    // 2️⃣ Verify user
    // -----------------------------
    const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // -----------------------------
    // 3️⃣ Decode base64
    // -----------------------------
    const match = String(fileBase64).match(
      /^data:(.+);base64,(.+)$/
    );

    if (!match) {
      return NextResponse.json(
        { success: false, error: "Invalid base64 format" },
        { status: 400 }
      );
    }

    const contentType = match[1];
    const base64Data = match[2];

    const buffer = Buffer.from(base64Data, "base64");

    // 5MB limit
    const MAX_SIZE = 5 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    // -----------------------------
    // 4️⃣ Build file path
    // -----------------------------
    const safeDocType = String(docType || "DOCUMENT")
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "");

    const ext = contentType.split("/")[1] || "bin";
    const filePath = `kyc/${uid}/${safeDocType}-${Date.now()}.${ext}`;

    // -----------------------------
    // 5️⃣ Upload to Firebase Storage
    // -----------------------------
    await bucket.file(filePath).save(buffer, {
      metadata: { contentType },
    });

    // -----------------------------
    // 6️⃣ Audit trail
    // -----------------------------
    await adminDb.collection("kycUploads").add({
      uid,
      docType: safeDocType,
      filePath,
      contentType,
      size: buffer.length,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      storagePath: filePath,
    });
  } catch (err: any) {
    console.error("KYC Upload Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
