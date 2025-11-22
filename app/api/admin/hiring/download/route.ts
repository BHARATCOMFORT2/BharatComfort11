// app/api/admin/hiring/download/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/hiring/download?path=gs://bucket/path/to/file.pdf
 *
 * Returns:
 *   { success: true, url: "<signed_url>" }
 */

export async function GET(req: Request) {
  try {
    const { adminStorage } = getFirebaseAdmin();
    const url = new URL(req.url);
    const gsPath = url.searchParams.get("path");

    if (!gsPath)
      return NextResponse.json(
        { success: false, error: "Missing 'path' parameter" },
        { status: 400 }
      );

    /** Validate GS path */
    if (!gsPath.startsWith("gs://"))
      return NextResponse.json(
        { success: false, error: "Invalid storage path" },
        { status: 400 }
      );

    /** Extract bucket + file */
    const match = gsPath.match(/^gs:\/\/([^/]+)\/(.+)$/);

    if (!match) {
      return NextResponse.json(
        { success: false, error: "Invalid Firebase Storage URL" },
        { status: 400 }
      );
    }

    const [, bucket, filePath] = match;
    const file = adminStorage.bucket(bucket).file(filePath);

    /** Generate signed URL (15 min) */
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 15, // 15 minutes
    });

    return NextResponse.json({
      success: true,
      url: signedUrl,
    });
  } catch (err: any) {
    console.error("🔥 Resume signed URL error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate signed URL" },
      { status: 500 }
    );
  }
}
