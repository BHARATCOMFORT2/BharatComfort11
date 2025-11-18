// app/api/partners/kyc/upload/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const partnerId = form.get("partnerId") as string;
    const file = form.get("file") as File;
    const docType = form.get("docType") as string;
    const token = form.get("token") as string;  // 🔥 required for security

    if (!partnerId || !file || !docType || !token) {
      return NextResponse.json(
        { error: "Missing partnerId, file, docType or token" },
        { status: 400 }
      );
    }

    // 🔐 Verify Firebase ID Token
    const { adminAuth, adminStorage } = getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
    if (!decoded || decoded.uid !== partnerId) {
      return NextResponse.json(
        { error: "Unauthorized upload attempt" },
        { status: 403 }
      );
    }

    // 📦 Convert file
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";

    // 🛡 Prevent overwriting (add timestamp)
    const fileName = `${partnerId}/${docType}-${Date.now()}.${ext}`;

    const bucketFile = adminStorage.file(`partner_kyc/${fileName}`);

    await bucketFile.save(buffer, {
      contentType: file.type,
      public: false, // 🔥 KYC should NEVER be public
    });

    // Return a safe GCS URL (not public)
    const gsUrl = `gs://${adminStorage.name}/partner_kyc/${fileName}`;

    return NextResponse.json({
      success: true,
      storagePath: gsUrl,
      message: "Upload successful"
    });
  } catch (err: any) {
    console.error("🔥 File upload error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
