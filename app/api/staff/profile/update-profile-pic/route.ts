export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { v4 as uuidv4 } from "uuid";

// Read Authorization header safely
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    // -------------------------------------------
    // 1) AUTH CHECK
    // -------------------------------------------
    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Missing Authorization header" },
        { status: 401 }
      );
    }

    const tokenMatch = authHeader.match(/^Bearer (.+)$/);
    if (!tokenMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid Authorization format" },
        { status: 401 }
      );
    }

    const { auth: adminAuth, db: adminDb, storage } = getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(tokenMatch[1], true);
    const staffId = decoded.uid;

    // -------------------------------------------
    // 2) VERIFY STAFF
    // -------------------------------------------
    const staffRef = adminDb.collection("staff").doc(staffId);
    const staffSnap = await staffRef.get();

    if (!staffSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Staff not found" },
        { status: 404 }
      );
    }

    const staff = staffSnap.data();
    if (
      staff.role !== "telecaller" ||
      staff.status !== "approved" ||
      staff.isActive !== true
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized access" },
        { status: 403 }
      );
    }

    // -------------------------------------------
    // 3) READ FORM DATA (FILE)
    // -------------------------------------------
    const form = await req.formData();
    const file = form.get("profilePic") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Profile picture file missing" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // -------------------------------------------
    // 4) UPLOAD TO FIREBASE STORAGE
    // -------------------------------------------
    const bucket = storage.bucket();
    const ext = file.name.split(".").pop();
    const fileName = `staff/profile/${staffId}/${uuidv4()}.${ext}`;

    const uploadFile = bucket.file(fileName);

    await uploadFile.save(buffer, {
      contentType: file.type,
      public: true,
      metadata: {
        firebaseStorageDownloadTokens: uuidv4(),
      },
    });

    // Public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // -------------------------------------------
    // 5) UPDATE FIRESTORE
    // -------------------------------------------
    await staffRef.update({
      profilePic: publicUrl,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Profile picture updated successfully",
      profilePic: publicUrl,
    });
  } catch (err: any) {
    console.error("❌ update-profile-pic error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to upload profile picture",
      },
      { status: 500 }
    );
  }
}
