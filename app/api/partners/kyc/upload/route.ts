// app/api/partners/kyc/upload/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * ✅ Partner KYC Document Upload (App Router Safe)
 * Multipart FormData:
 * - file: File
 * - docType: string (e.g. AADHAAR | GST | PAN)
 * - token?: Firebase ID token (fallback if no cookie)
 */
export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin, storage } = getFirebaseAdmin();
    const bucket = storage; // already a bucket in your setup

    // -----------------------------------
    // 1) Parse FormData
    // -----------------------------------
    const formData = await req.formData();

    const rawFile = formData.get("file");
    const docTypeRaw = formData.get("docType");
    const tokenField = formData.get("token");

    // Validate file object (App Router safety)
    if (!rawFile || typeof (rawFile as any).arrayBuffer !== "function") {
      return NextResponse.json(
        { success: false, error: "Invalid file uploaded" },
        { status: 400 }
      );
    }

    const file = rawFile as File;

    // Normalize docType (UPPERCASE for consistency)
    const docType =
      typeof docTypeRaw === "string" && docTypeRaw.trim()
        ? docTypeRaw.trim().toUpperCase()
        : "DOCUMENT";

    const safeDocType = docType.replace(/[^A-Z0-9_-]/g, "");

    // -----------------------------------
    // 2) Auth: session cookie OR bearer OR token in form
    // -----------------------------------
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("__session="))
        ?.split("=")[1] || "";

    const authHeader = req.headers.get("authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : "";

    const idTokenFromForm =
      typeof tokenField === "string" ? tokenField : "";

    let decoded: any = null;

    if (sessionCookie) {
      decoded = await adminAuth
        .verifySessionCookie(sessionCookie, true)
        .catch(() => null);
    }

    if (!decoded && bearerToken) {
      decoded = await adminAuth.verifyIdToken(bearerToken).catch(() => null);
    }

    if (!decoded && idTokenFromForm) {
      decoded = await adminAuth.verifyIdToken(idTokenFromForm).catch(() => null);
    }

    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // -----------------------------------
    // 3) Validate File (type & size)
    // -----------------------------------
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type" },
        { status: 400 }
      );
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    // -----------------------------------
    // 4) Upload to Firebase Storage (SAFE)
    // -----------------------------------
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(bytes));

    const ext = file.name && file.name.includes(".")
      ? file.name.split(".").pop()
      : "bin";

    const filePath = `kyc/${uid}/${safeDocType}-${Date.now()}.${ext}`;

    const fileRef = bucket.file(filePath);

    await fileRef.save(buffer, {
      metadata: { contentType: file.type },
    });

    // (Files are private by default; no need to call makePrivate)

    // -----------------------------------
    // 5) Audit trail
    // -----------------------------------
    await adminDb.collection("kycUploads").add({
      uid,
      docType: safeDocType,
      filePath,
      contentType: file.type,
      size: file.size,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      storagePath: filePath,
      message: "File uploaded successfully",
    });
  } catch (err: any) {
    console.error("KYC Upload Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
