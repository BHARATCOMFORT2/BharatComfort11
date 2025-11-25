// app/api/partners/kyc/upload/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const partnerId = form.get("partnerId") as string;
    const file = form.get("file") as File;
    const docType = form.get("docType") as string;
    const token = form.get("token") as string;

    if (!partnerId || !file || !docType || !token) {
      return NextResponse.json(
        { error: "Missing partnerId, token, file or docType" },
        { status: 400 }
      );
    }

    // ---------------------------------------------------
    // 1️⃣ VERIFY TOKEN
    // ---------------------------------------------------
    const { adminAuth, adminStorage } = getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(token).catch(() => null);

    if (!decoded || decoded.uid !== partnerId) {
      return NextResponse.json(
        { error: "Unauthorized upload attempt" },
        { status: 403 }
      );
    }

    // ---------------------------------------------------
    // 2️⃣ PREPARE FILE BUFFER
    // ---------------------------------------------------
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();

    const cleanDocType = docType.toLowerCase().replace(/[^a-z0-9_-]/g, "_");

    const filePath = `partner_kyc/${partnerId}/${cleanDocType}-${timestamp}.${ext}`;

    // ---------------------------------------------------
    // 3️⃣ DETECT STORAGE BUCKET (Fix for all Firebase versions)
    // ---------------------------------------------------
    let bucket: any;

    if (typeof adminStorage.bucket === "function") {
      // Firebase Admin v10+
      bucket = adminStorage.bucket();
    } else if (adminStorage?.bucket) {
      // Direct bucket reference
      bucket = adminStorage.bucket;
    } else {
      throw new Error("Firebase Storage bucket not initialized properly.");
    }

    const bucketFile = bucket.file(filePath);

    // ---------------------------------------------------
    // 4️⃣ SAVE FILE
    // ---------------------------------------------------
    await bucketFile.save(buffer, {
      contentType: file.type || "application/octet-stream",
      metadata: {
        firebaseStorageDownloadTokens: timestamp.toString(),
      },
      resumable: false,
    });

    const gsUrl = `gs://${bucket.name}/${filePath}`;

    return NextResponse.json({
      success: true,
      storagePath: gsUrl,
      filePath,
      message: "Upload successful",
    });
  } catch (err: any) {
    console.error("🔥 File Upload Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
