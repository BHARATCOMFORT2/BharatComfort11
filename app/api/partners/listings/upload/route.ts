export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminStorage } from "@/lib/firebaseadmin";

/* ---------------------------------------------
   Safe Header Reader
--------------------------------------------- */
function getAuthHeader(req: Request) {
  return req.headers.get("authorization") || "";
}

/* ---------------------------------------------
   ✅ ✅ PARTNER LISTING IMAGE UPLOAD (FINAL FIXED)
--------------------------------------------- */
export async function POST(req: Request) {
  try {
    /* ✅ 1️⃣ AUTH VERIFY */
    const authHeader = getAuthHeader(req);

    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace("Bearer ", "").trim();

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    /* ✅ 2️⃣ FILE READ */
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "File missing" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    /* ✅ 3️⃣ STORAGE PATH */
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const path = `listings/${uid}/${filename}`;

    /* ✅ ✅ ✅ 4️⃣ REAL BUCKET (NO FAKE appspot) */
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(path);

    await fileRef.save(buffer, {
      contentType: file.type || "application/octet-stream",
      public: true,
      gzip: true,
      metadata: {
        firebaseStorageDownloadTokens: uuidv4(),
      },
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path,
    });
  } catch (err: any) {
    console.error("🔥 Upload error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}

/* ---------------------------------------------
   Public download token
--------------------------------------------- */
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
