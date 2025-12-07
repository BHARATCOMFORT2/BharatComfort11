export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminStorage } from "@/lib/firebaseadmin";

/* ✅ SAFE AUTH HEADER */
function getAuthHeader(req: Request) {
  return req.headers.get("authorization") || "";
}

export async function POST(req: Request) {
  try {
    /* ✅ AUTH */
    const authHeader = getAuthHeader(req);
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Missing Authorization" },
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
        { success: false, error: "No file received" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    /* ✅ STORAGE PATH */
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
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

    /* ✅ MAKE PUBLIC */
    await storageFile.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path,
    });
  } catch (err: any) {
    console.error("❌ FINAL UPLOAD ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: String(err?.message || err || "Upload failed"),
      },
      { status: 500 }
    );
  }
}
