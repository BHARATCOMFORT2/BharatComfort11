export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// Extract Authorization header safely
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    // ------------------------------
    // 1) AUTH CHECK
    // ------------------------------
    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Missing Authorization" },
        { status: 401 }
      );
    }

    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m) {
      return NextResponse.json(
        { success: false, message: "Bad Authorization header" },
        { status: 401 }
      );
    }

    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(m[1], true);
    const staffId = decoded.uid;

    // ------------------------------
    // 2) READ BODY
    // ------------------------------
    const body = await req.json();
    const { name, profilePic } = body || {};

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { success: false, message: "Name is required" },
        { status: 400 }
      );
    }

    const cleanName = String(name).trim();

    // ------------------------------
    // 3) VERIFY STAFF
    // ------------------------------
    const staffRef = adminDb.collection("staff").doc(staffId);
    const staffSnap = await staffRef.get();

    if (!staffSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Staff not found" },
        { status: 404 }
      );
    }

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

    // ------------------------------
    // 4) UPDATE BASIC PROFILE
    // ------------------------------
    const updateData: any = {
      name: cleanName,
      updatedAt: new Date(),
    };

    // OPTIONAL: Save uploaded profile picture URL
    if (profilePic && typeof profilePic === "string") {
      updateData.profilePic = profilePic;
    }

    await staffRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      updated: updateData,
    });
  } catch (err: any) {
    console.error("❌ update-basic error:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update basic profile",
      },
      { status: 500 }
    );
  }
}
