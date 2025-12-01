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
    // ✅ ADMIN TOKEN VERIFY
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

    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(m[1], true);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid admin token" },
        { status: 401 }
      );
    }

    const adminId = decoded.uid;

    // ✅ VERIFY ADMIN FROM FIRESTORE (SOURCE OF TRUTH)
    const adminSnap = await adminDb.collection("admins").doc(adminId).get();
    if (!adminSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Admin access denied" },
        { status: 403 }
      );
    }

    // ✅ REQUEST BODY
    const body = await req.json();
    const { leadIds, staffId, adminNote } = body || {};

    if (!Array.isArray(leadIds) || leadIds.length === 0 || !staffId) {
      return NextResponse.json(
        { success: false, message: "leadIds (array) and staffId are required" },
        { status: 400 }
      );
    }

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
        {
          success: false,
          message: "Staff is not an active approved telecaller",
        },
        { status: 400 }
      );
    }

    // ✅ BATCH SAFE UPDATE
    const batch = adminDb.batch();
    const now = new Date();

    for (const leadId of leadIds) {
      const ref = adminDb.collection("leads").doc(leadId);

      batch.update(ref, {
        assignedTo: staffId,
        assignedAt: now,

        // ❗ status ko forcefully "assigned" mat karo
        // jo current status hai wahi rehne do

        adminNote: adminNote ? String(adminNote).trim() : "",
        updatedAt: now,
        lastUpdatedBy: adminId,
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: "✅ Bulk assignment completed successfully",
      total: leadIds.length,
    });
  } catch (err: any) {
    console.error("ADMIN BULK ASSIGN ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Bulk assign failed",
      },
      { status: 500 }
    );
  }
}
