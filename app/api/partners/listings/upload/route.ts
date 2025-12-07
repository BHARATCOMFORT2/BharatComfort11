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
   ✅ PARTNER LISTING IMAGE UPLOAD API (FINAL REAL FIX)
--------------------------------------------- */
export async function POST(req: Request) {
  try {
    /* ✅ 1️⃣ AUTH TOKEN VERIFY */
    const authHeader = getAuthHeader(req);

    if (!authHeader?.startsWith("Bearer ")) {
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

    /* ✅ 2️⃣ READ FILE */
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

    /* ✅ 3️⃣ SAFE STORAGE PATH */
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const path = `listings/${uid}/${filename}`;

    /* ✅ 4️⃣ STORAGE BUCKET */
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(path);

    /* ✅ ✅ ✅ FINAL CORE FIX HERE */
    await fileRef.save(buffer, {
      contentType: file.type || "application/octet-stream",
      resumable: false,          // ✅ public: true HATA DIYA
    });

    // ✅ FILE KO PUBLIC BANAO (YAHI ASLI FIX HAI)
    await fileRef.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

    return NextResponse.json({
      success: true,          // ✅ Frontend yahi expect karta hai
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
