export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminStorage } from "@/lib/firebaseadmin";

function getAuthHeader(req: Request) {
  const h = (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
  return h || "";
}

export async function POST(req: Request) {
  try {
    const authHeader = getAuthHeader(req);
    if (!authHeader)
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );

    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m)
      return NextResponse.json(
        { error: "Malformed Authorization header" },
        { status: 401 }
      );

    const idToken = m[1];

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

    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file)
      return NextResponse.json({ error: "File missing" }, { status: 400 });

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Storage path: listings/{uid}/{timestamp}-{filename}
    const filename = `${Date.now()}-${file.name}`;
    const path = `listings/${uid}/${filename}`;

    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(path);

    await fileRef.save(buffer, {
      contentType: file.type,
      public: true,
      gzip: true,
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      path,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
