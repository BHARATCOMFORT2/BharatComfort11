// app/api/partners/kyc/upload/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * ✅ Partner KYC Document Upload
 * Multipart FormData:
 * - file: File
 * - docType: "aadhaar" | "gst" | "pan" | string
 * - token?: Firebase ID token (optional, fallback if no cookie)
 * - partnerId?: string (ignored on server, uid from auth is source of truth)
 */
export async function POST(req: Request) {
  try {
    // ✅ storage ALREADY A BUCKET (as per your setup)
    const { adminAuth, adminDb, admin, storage } = getFirebaseAdmin();
    const bucket = storage;

    // -----------------------------------
    // 1) Parse FormData (for token etc.)
    // -----------------------------------
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const docTypeRaw = formData.get("docType");
    const tokenField = formData.get("token");
    // const partnerIdField = formData.get("partnerId"); // ❌ ignore, we trust auth.uid

    const docType =
      typeof docTypeRaw === "string"
        ? docTypeRaw.toLowerCase()
        : "document";

    // -----------------------------------
    // 2) Auth: Session Cookie OR Bearer OR token in form
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

    // 1️⃣ Try session cookie
    if (sessionCookie) {
      decoded = await adminAuth
        .verifySessionCookie(sessionCookie, true)
        .catch(() => null);
    }

    // 2️⃣ Try Authorization: Bearer <idToken>
    if (!decoded && bearerToken) {
      decoded = await adminAuth.verifyIdToken(bearerToken).catch(() => null);
    }

    // 3️⃣ Try token field from form-data (from your KYC page)
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
    // 3) Validate File
    // -----------------------------------
    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file uploaded" },
        { status: 400 }
      );
    }

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

    // Max 5MB
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large (max 5MB)" },
        { status: 400 }
      );
    }

    // -----------------------------------
    // 4) Upload to Firebase Storage
    // -----------------------------------
    const buffer = Buffer.from(await file.arrayBuffer());

    const ext = file.name.includes(".")
      ? file.name.split(".").pop()
      : "bin";

    const safeDocType = docType.replace(/[^a-z0-9_-]/gi, "");
    const filePath = `kyc/${uid}/${safeDocType || "document"}-${Date.now()}.${ext}`;

    const fileRef = bucket.file(filePath);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // default is private, but keeping explicit:
    await fileRef.makePrivate();

    // -----------------------------------
    // 5) Save Document Reference (Audit)
    // -----------------------------------
    await adminDb.collection("kycUploads").add({
      uid,
      docType: safeDocType || "document",
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
    console.error("✅ KYC Upload Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
