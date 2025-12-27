export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * ✅ Partner KYC Upload (MULTIPART – FINAL)
 * Expects FormData:
 * - file
 * - docType
 * - token
 */
export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin, storage } = getFirebaseAdmin();
    const bucket = storage;

    // 🔴 MULTIPART PARSE
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const docTypeRaw = formData.get("docType");
    const token = formData.get("token");

    if (!file || !token) {
      return NextResponse.json(
        { success: false, error: "Missing file or token" },
        { status: 400 }
      );
    }

    // 🔐 Verify token
    const decoded = await adminAuth.verifyIdToken(String(token)).catch(() => null);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // Validate file
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type" },
        { status: 400 }
      );
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    // 🔴 Upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(bytes));

    const safeDocType = String(docTypeRaw || "DOCUMENT")
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "");

    const ext = file.name.split(".").pop() || "bin";
    const filePath = `kyc/${uid}/${safeDocType}-${Date.now()}.${ext}`;

    await bucket.file(filePath).save(buffer, {
      metadata: { contentType: file.type },
    });

    // 🔴 Audit
    await adminDb.collection("kycUploads").add({
      uid,
      docType: safeDocType,
      filePath,
      contentType: file.type,
      size: file.size,
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
