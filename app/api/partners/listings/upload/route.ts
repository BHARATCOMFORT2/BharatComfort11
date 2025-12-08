export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminStorage } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    /* ✅ AUTH */
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "Missing Authorization" },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace("Bearer ", "").trim();
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const uid = decoded.uid;

    /* ✅ FILE READ */
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No file received" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    /* ✅ SAFE STORAGE PATH */
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const filename = `${Date.now()}-${safeName}`;
    const path = `listings/${uid}/${filename}`;

    const bucket = adminStorage.bucket();
    const storageFile = bucket.file(path);

    /* ✅ UPLOAD */
    await storageFile.save(buffer, {
      resumable: false,
      contentType: file.type || "image/jpeg",
      metadata: {
        cacheControl: "public,max-age=31536000",
      },
    });

    /* ✅ ✅ ✅ MAKE FILE PUBLIC (🔥 MAIN FIX) */
    await storageFile.makePublic();

    /* ✅ ✅ ✅ PUBLICLY ACCESSIBLE IMAGE URL */
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

    return NextResponse.json({
      ok: true,
      url: publicUrl,   // ✅ NOW IT WILL ACTUALLY OPEN
      path,
    });

  } catch (err: any) {
    console.error("❌ FINAL UPLOAD ERROR:", err);

    return NextResponse.json(
      {
        ok: false,
        error: String(err?.message || err || "Upload failed"),
      },
      { status: 500 }
    );
  }
}
