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
    // 2️⃣ Convert file to Buffer
    // ---------------------------------------------------
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();

    const cleanDocType = docType.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const filePath = `partner_kyc/${partnerId}/${cleanDocType}-${timestamp}.${ext}`;

    // ---------------------------------------------------
    // 3️⃣ Universal Bucket Detection (100% Stable)
    // ---------------------------------------------------
    let bucket: any;

    if (adminStorage?.bucket && typeof adminStorage.bucket === "function") {
      bucket = adminStorage.bucket(); // Normal expected case
    } else if (adminStorage?.bucket) {
      bucket = adminStorage.bucket; // Bucket instance directly
    } else if (typeof adminStorage === "object" && adminStorage.file) {
      bucket = adminStorage; // direct bucket passed
    } else {
      throw new Error("Firebase Storage bucket not initialized.");
    }

    const bucketFile = bucket.file(filePath);

    // ---------------------------------------------------
    // 4️⃣ Upload file
    // ---------------------------------------------------
    await bucketFile.save(buffer, {
      contentType: file.type || "application/octet-stream",
      resumable: false,
      metadata: {
        firebaseStorageDownloadTokens: timestamp.toString(),
      },
    });

    const gsUrl = `gs://${bucket.name}/${filePath}`;

    return NextResponse.json({
      success: true,
      storagePath: gsUrl,
      filePath,
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
