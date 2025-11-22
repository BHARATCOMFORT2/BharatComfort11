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
        { error: "Missing partnerId, file, docType or token" },
        { status: 400 }
      );
    }

    // --------------------------
    // 🔐 VERIFY TOKEN
    // --------------------------
    const { adminAuth, adminStorage } = getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(token).catch(() => null);

    if (!decoded || decoded.uid !== partnerId) {
      return NextResponse.json(
        { error: "Unauthorized upload attempt" },
        { status: 403 }
      );
    }

    // --------------------------
    // 📦 PREPARE FILE
    // --------------------------
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();

    const cleanDocType = docType.toLowerCase().replace(/[^a-z0-9_-]/g, "_");

    const filePath = `partner_kyc/${partnerId}/${cleanDocType}-${timestamp}.${ext}`;

    // --------------------------
    // 🪣 FIXED: Proper bucket reference
    // --------------------------
    const bucket = adminStorage.bucket ? adminStorage.bucket() : adminStorage;
    const bucketFile = bucket.file(filePath);

    await bucketFile.save(buffer, {
      contentType: file.type,
      public: false, // NEVER allow public access
    });

    const gsUrl = `gs://${bucket.name}/${filePath}`;

    return NextResponse.json({
      success: true,
      storagePath: gsUrl,
      message: "Upload successful",
    });
  } catch (err: any) {
    console.error("🔥 File upload error:", err);

    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
