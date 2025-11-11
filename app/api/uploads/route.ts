import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import { getStorage } from "firebase-admin/storage";

export const runtime = "nodejs";

// 5MB limit
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: Request) {
  try {
    // --- Verify token ---
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    // --- Parse form data ---
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // --- Validate file type and size ---
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WEBP allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max 5MB allowed." },
        { status: 400 }
      );
    }

    // --- Upload to Firebase Storage ---
    const storage = getStorage().bucket();
    const fileName = `uploads/${uid}/${Date.now()}-${encodeURIComponent(file.name)}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const fileRef = storage.file(fileName);
    await fileRef.save(fileBuffer, {
      contentType: file.type,
      public: true,
      metadata: { cacheControl: "public, max-age=31536000" },
    });

    const publicUrl = `https://storage.googleapis.com/${storage.name}/${fileName}`;

    // --- Optional: Store record in Firestore ---
    await db.collection("uploads").add({
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
