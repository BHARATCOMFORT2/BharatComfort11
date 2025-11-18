// app/api/partners/kyc/upload/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";

// Accept multipart/form-data
export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const partnerId = form.get("partnerId") as string;
    const file = form.get("file") as File;
    const docType = form.get("docType") as string; // "aadharFront", "aadharBack", "pan", etc.

    if (!partnerId || !file || !docType) {
      return NextResponse.json(
        { error: "Missing partnerId, file or docType" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";

    const fileName = `${partnerId}/${docType}.${ext}`;

    const { adminStorage } = getFirebaseAdmin();
    const bucketFile = adminStorage.file(`partner_kyc/${fileName}`);

    await bucketFile.save(buffer, {
      contentType: file.type,
      public: true, // allow public access
    });

    const publicUrl = `https://storage.googleapis.com/${adminStorage.name}/partner_kyc/${fileName}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err: any) {
    console.error("🔥 File upload error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
