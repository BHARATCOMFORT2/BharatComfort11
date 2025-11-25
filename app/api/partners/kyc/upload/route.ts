// app/api/partners/kyc/upload/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const partnerId = form.get("partnerId") as string;
    const token = form.get("token") as string;
    const file = form.get("file") as File;
    const docType = form.get("docType") as string;

    if (!partnerId || !token || !file || !docType) {
      return NextResponse.json(
        { error: "Missing partnerId, token, file or docType" },
        { status: 400 }
      );
    }

    // ---------------------------------------------------
    // 1️⃣ VERIFY Firebase ID TOKEN
    // ---------------------------------------------------
    const { adminAuth, adminStorage } = getFirebaseAdmin();

    const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
    if (!decoded || decoded.uid !== partnerId) {
      return NextResponse.json(
        { error: "Unauthorized upload" },
        { status: 403 }
      );
    }

    // ---------------------------------------------------
    // 2️⃣ Convert file to buffer
    // ---------------------------------------------------
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();

    const cleanDocType = docType.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const filePath = `partner_kyc/${partnerId}/${cleanDocType}-${timestamp}.${ext}`;

    // ---------------------------------------------------
    // 3️⃣ ALWAYS USE Firebase Admin Default Bucket
    // ---------------------------------------------------
    // ❗ This is the actual fix — never manually detect buckets
    const bucket = adminStorage.bucket(); // <-- Always valid

    const bucketFile = bucket.file(filePath);

    // ---------------------------------------------------
    // 4️⃣ Upload
    // ---------------------------------------------------
    await bucketFile.save(buffer, {
      contentType: file.type || "application/octet-stream",
      resumable: false,
      metadata: {
        firebaseStorageDownloadTokens: timestamp.toString(),
      },
    });

    return NextResponse.json({
      success: true,
      filePath,
      storagePath: `gs://${bucket.name}/${filePath}`,
      message: "Upload successful",
    });
  } catch (err: any) {
    console.error("🔥 KYC Upload Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
