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

    // ✅ VERIFY ADMIN
    const adminSnap = await adminDb.collection("admins").doc(adminId).get();
    if (!adminSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Admin access denied" },
        { status: 403 }
      );
    }

    // ✅ REQUEST BODY
    const body = await req.json();
    const { leadId, staffId, adminNote, dueDate } = body || {};

    if (!leadId || !staffId) {
      return NextResponse.json(
        { success: false, message: "leadId and staffId are required" },
        { status: 400 }
      );
    }

    // ✅ VERIFY LEAD
    const leadRef = adminDb.collection("leads").doc(leadId);
    const leadSnap = await leadRef.get();
    if (!leadSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
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
      staffData?.status !== "approved" ||
      staffData?.isActive !== true ||
      staffData?.role !== "telecaller"
    ) {
      return NextResponse.json(
        { success: false, message: "Staff is not an active telecaller" },
        { status: 400 }
      );
    }

    // ✅ FINAL SAFE UPDATE
    const updateData: any = {
      assignedTo: staffId,
      assignedAt: new Date(),
      updatedAt: new Date(),
      lastUpdatedBy: adminId,
    };

    if (adminNote) updateData.adminNote = String(adminNote).trim();
    if (dueDate) updateData.dueDate = new Date(dueDate);

    await leadRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: "✅ Lead successfully assigned to telecaller",
    });
  } catch (error: any) {
    console.error("ADMIN ASSIGN LEAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Lead assignment failed",
      },
      { status: 500 }
    );
  }
}
