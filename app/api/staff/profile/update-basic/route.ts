export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

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

    // ✅ READ BODY
    const body = await req.json();
    const { name } = body || {};

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { success: false, message: "Name is required" },
        { status: 400 }
      );
    }

    const cleanName = String(name).trim();

    // ✅ VERIFY STAFF
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

    // ✅ UPDATE BASIC PROFILE
    await staffRef.update({
      name: cleanName,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "✅ Basic profile updated successfully",
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
