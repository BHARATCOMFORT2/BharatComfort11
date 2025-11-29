// app/api/partners/kyc/upload/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * ✅ Partner KYC Document Upload
 * Multipart FormData:
 * - file: File
 * - docType: "aadhaar" | "gst" | "pan" | string
 */
export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin, storage } = getFirebaseAdmin();

    // -----------------------------------
    // 1) Auth: Session Cookie OR Token Header
    // -----------------------------------
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("__session="))
        ?.split("=")[1] || "";

    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.split("Bearer ")[1]
      : null;

    let decoded: any = null;

    if (sessionCookie) {
      decoded = await adminAuth
        .verifySessionCookie(sessionCookie, true)
        .catch(() => null);
    }

    if (!decoded && bearerToken) {
      decoded = await adminAuth
        .verifyIdToken(bearerToken)
        .catch(() => null);
    }

    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // -----------------------------------
    // 2) Parse FormData
    // -----------------------------------
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const docTypeRaw = formData.get("docType");

    const docType =
      typeof docTypeRaw === "string"
        ? docTypeRaw.toLowerCase()
        : "document";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

    // -----------------------------------
    // 3) Validate File
    // -----------------------------------
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

    // Max 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    // -----------------------------------
    // 4) Upload to Firebase Storage
    // -----------------------------------
    const bucket = storage.bucket();
    const buffer = Buffer.from(await file.arrayBuffer());

    const ext = file.name.split(".").pop();
    const filePath = `kyc/${uid}/${docType}-${Date.now()}.${ext}`;

    const fileRef = bucket.file(filePath);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // Make file private (recommended)
    await fileRef.makePrivate();

    // -----------------------------------
    // 5) Save Document Reference (Optional)
    // -----------------------------------
    await adminDb.collection("kycUploads").add({
      uid,
      docType,
      filePath,
      contentType: file.type,
      size: file.size,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      storagePath: filePath,
      message: "File uploaded successfully",
    });
  } catch (err: any) {
    console.error("KYC Upload Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
