export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// limits
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: Request) {
  try {
    /* -------------------------------
       1️⃣ AUTH
    -------------------------------- */
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const { adminAuth, adminDb, adminStorage } = getFirebaseAdmin();

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    /* -------------------------------
       2️⃣ FORM DATA
    -------------------------------- */
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Max ${MAX_FILES} images allowed` },
        { status: 400 }
      );
    }

    /* -------------------------------
       3️⃣ UPLOAD LOOP
    -------------------------------- */
    const bucket = adminStorage.bucket();
    const uploadedUrls: string[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.name}` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large: ${file.name}` },
          { status: 400 }
        );
      }

      const fileName = `uploads/${uid}/${Date.now()}-${file.name}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const fileRef = bucket.file(fileName);
      await fileRef.save(buffer, { contentType: file.type });
      await fileRef.makePublic();

      const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      uploadedUrls.push(url);

      await adminDb.collection("uploads").add({
        uid,
        url,
        name: file.name,
        size: file.size,
        type: file.type,
        createdAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
    });
  } catch (err: any) {
    console.error("❌ Multi upload error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
