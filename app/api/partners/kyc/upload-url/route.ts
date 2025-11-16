export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// app/api/partners/kyc/upload-url/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminStorage } from "@/lib/firebaseadmin";

// Extract Authorization header
function getAuthHeader(req: Request) {
  const auth = (req as any).headers?.get
    ? (req as any).headers.get("authorization")
    : (req as any).headers?.authorization;
  return auth || "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { filename, contentType } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "filename & contentType are required" },
        { status: 400 }
      );
    }

    // 1) Authenticate the user
    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
    }

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Malformed Authorization header" }, { status: 401 });
    }

    const idToken = match[1];

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const uid = decoded.uid;

    // 2) Build a secure storage path
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/\s+/g, "_");
    const storagePath = `kyc/${uid}/${timestamp}_${sanitizedFilename}`;

    const file = adminStorage.file(storagePath);

    // 3) Generate signed URL (PUT upload URL)
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const [url] = await file.getSignedUrl({
      action: "write",
      expires: expiresAt,
      contentType,
    });

    return NextResponse.json({
      ok: true,
      uploadUrl: url,
      storagePath,
      expiresAt,
    });
  } catch (err: any) {
    console.error("Upload URL error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
