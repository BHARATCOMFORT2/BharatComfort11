export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import admin from "firebase-admin";

// ✅ Allowed dropdown values (LOCKED)
const ALLOWED_STATUS = [
  "new",
  "contacted",
  "interested",
  "not_interested",
  "callback",
  "converted",
  "invalid",
];

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

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(m[1], true);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    const staffId = decoded.uid;

    const body = await req.json();
    const { leadId, status } = body || {};

    if (!leadId || !status) {
      return NextResponse.json(
        { success: false, message: "leadId and status are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUS.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid status value" },
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
        { success: false, message: "Unauthorized staff access" },
        { status: 403 }
      );
    }

    // ✅ VERIFY LEAD OWNERSHIP
    const leadRef = adminDb.collection("leads").doc(leadId);
    const leadSnap = await leadRef.get();

    if (!leadSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    const leadData = leadSnap.data();

    if (leadData?.assignedTo !== staffId) {
      return NextResponse.json(
        { success: false, message: "You are not assigned to this lead" },
        { status: 403 }
      );
    }

    // ✅ ✅ ✅ FINAL SAFE STATUS UPDATE (WITH SERVER TIMESTAMP)
    await leadRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(), // ✅ BEST PRACTICE
      lastUpdatedBy: staffId,
    });

    return NextResponse.json({
      success: true,
      message: "✅ Lead status updated successfully",
    });
  } catch (error: any) {
    console.error("Lead status update error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update lead status" },
      { status: 500 }
    );
  }
}
