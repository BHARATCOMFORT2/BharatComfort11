export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminStorage } from "@/lib/firebaseadmin";

/* ---------------------------------------------
   Safe Header Reader
--------------------------------------------- */
function getAuthHeader(req: Request) {
  const h = (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
  return h || "";
}

/* ---------------------------------------------
   PARTNER LISTING IMAGE UPLOAD API
--------------------------------------------- */
export async function POST(req: Request) {
  try {
    /* ✅ 1️⃣ AUTH TOKEN VERIFY */
    const authHeader = getAuthHeader(req);

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace("Bearer ", "").trim();

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    /* ✅ 2️⃣ READ FILE */
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "File missing" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    /* ✅ 3️⃣ SAFE STORAGE PATH */
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const path = `listings/${uid}/${filename}`;

    /* ✅ ✅ ✅ MAIN FIX (NO MORE u.C.bucket ERROR) */
    const bucket = adminStorage.bucket(); // ✅ THIS WAS THE ROOT CAUSE
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
      ok: true,
      url: publicUrl,
      path,
    });
  } catch (err: any) {
    console.error("🔥 Upload error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}

/* ---------------------------------------------
   ✅ TOKEN FOR PUBLIC FILE ACCESS
--------------------------------------------- */
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
