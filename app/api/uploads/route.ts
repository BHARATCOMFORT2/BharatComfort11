export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// 5MB limit
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: Request) {
  try {
    /* ----------------------------------
       1️⃣ AUTH VERIFY (MANDATORY)
    ---------------------------------- */
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];

    const { adminAuth, adminDb, adminStorage } = getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    /* ----------------------------------
       2️⃣ FORM DATA
    ---------------------------------- */
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type (JPEG, PNG, WEBP only)" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (Max 5MB)" },
        { status: 400 }
      );
    }

    /* ----------------------------------
       3️⃣ STORAGE UPLOAD
    ---------------------------------- */
    const bucket = adminStorage.bucket();
    const fileName = `uploads/${uid}/${Date.now()}-${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, {
      contentType: file.type,
      metadata: { cacheControl: "public, max-age=31536000" },
    });

    await fileRef.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    /* ----------------------------------
       4️⃣ FIRESTORE LOG
    ---------------------------------- */
    await adminDb.collection("uploads").add({
      uid,
      url: publicUrl,
      name: file.name,
      size: file.size,
      type: file.type,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err: any) {
    console.error("❌ Upload error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
