export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import admin from "firebase-admin"; // ✅ Required for FieldValue & Storage

// ✅ Auth header helper
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    // ✅ TOKEN VERIFY
    const authHeader = getAuthHeader(req);
    if (!authHeader)
      return NextResponse.json(
        { success: false, message: "Missing Authorization" },
        { status: 401 }
      );

    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m)
      return NextResponse.json(
        { success: false, message: "Bad Authorization header" },
        { status: 401 }
      );

    const { auth: adminAuth, db: adminDb, bucket } = getFirebaseAdmin();

    const decoded = await adminAuth.verifyIdToken(m[1], true);
    const staffId = decoded.uid;

    // ✅ FORM DATA READ
    const form = await req.formData();
    const last4 = String(form.get("last4") || "").trim();
    const imageFile = form.get("aadhaarImage") as File | null;

    if (!last4 || last4.length !== 4) {
      return NextResponse.json(
        { success: false, message: "Invalid Aadhaar last 4 digits" },
        { status: 400 }
      );
    }

    if (!imageFile) {
      return NextResponse.json(
        { success: false, message: "Aadhaar image is required" },
        { status: 400 }
      );
    }

    // ✅ VERIFY STAFF
    const staffRef = adminDb.collection("staff").doc(staffId);
    const staffSnap = await staffRef.get();

    if (!staffSnap.exists)
      return NextResponse.json(
        { success: false, message: "Staff not found" },
        { status: 404 }
      );

    const staffData = staffSnap.data();
    if (
      staffData?.role !== "telecaller" ||
      staffData?.status !== "approved" ||
      staffData?.isActive !== true
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized staff access" },
        { status: 403 }
      );
    }

    // ✅ UPLOAD IMAGE TO FIREBASE STORAGE (PRIVATE)
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const filePath = `staff_uploads/${staffId}/aadhaar.jpg`;
    const fileRef = bucket.file(filePath);

    await fileRef.save(buffer, {
      metadata: {
        contentType: imageFile.type,
      },
      resumable: false,
    });

    // ✅ Generate Signed URL (admin use / secure display)
    const [signedUrl] = await fileRef.getSignedUrl({
      action: "read",
      expires: "03-01-2035", // long-term secure link
    });

    // ✅ SAVE TO FIRESTORE (SAFE DATA ONLY)
    await staffRef.update({
      aadhaar: {
        last4,
        verified: false,
        imageUrl: signedUrl,
      },
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "✅ Aadhaar details submitted successfully",
      imageUrl: signedUrl,
    });
  } catch (err: any) {
    console.error("❌ update-aadhaar error:", err);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update Aadhaar details",
      },
      { status: 500 }
    );
  }
}
