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
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    const staffId = decoded.uid;

    const body = await req.json();
    const { leadId, text } = body || {};

    if (!leadId || !text) {
      return NextResponse.json(
        { success: false, message: "leadId and text are required" },
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

    const cleanText = String(text).trim();

    const noteData = {
      text: cleanText,
      addedBy: staffId,
      createdAt: new Date(),
    };

    // ✅ ✅ ✅ FINAL SAFE UPDATE (HISTORY + QUICK VIEW)
    await leadRef.update({
      notes: adminDb.constructor.FieldValue.arrayUnion(noteData), // ✅ FULL HISTORY
      partnerNotes: cleanText,        // ✅ QUICK VIEW FOR UI
      lastRemark: cleanText,          // ✅ ADMIN QUICK VIEW
      lastUpdatedBy: staffId,         // ✅ TRACK WHO UPDATED
      updatedAt: new Date(),          // ✅ SORTING/FILTERING
    });

    return NextResponse.json({
      success: true,
      message: "✅ Lead note saved successfully",
    });
  } catch (error: any) {
    console.error("Lead note update error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update lead note" },
      { status: 500 }
    );
  }
}
