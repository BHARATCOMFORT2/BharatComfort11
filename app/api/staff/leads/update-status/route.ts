export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import admin from "firebase-admin";

// Allowed dropdown values
const ALLOWED_STATUS = [
  "new",
  "contacted",
  "interested",
  "not_interested",
  "callback",
  "converted",
  "invalid",
];

// Auth header helper
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    /* ---------- AUTH ---------- */
    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Missing Authorization" },
        { status: 401 }
      );
    }

    const tokenMatch = authHeader.match(/^Bearer (.+)$/);
    if (!tokenMatch) {
      return NextResponse.json(
        { success: false, message: "Bad Authorization header" },
        { status: 401 }
      );
    }

    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(tokenMatch[1]);
    const staffId = decoded.uid;

    /* ---------- BODY ---------- */
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const leadId = body?.leadId;
    const callbackDate = body?.callbackDate || null;

    // 🔥 STATUS NORMALIZATION
    const rawStatus = body?.status;
    const status =
      typeof rawStatus === "string"
        ? rawStatus.toLowerCase()
        : typeof rawStatus === "object" && rawStatus?.value
        ? String(rawStatus.value).toLowerCase()
        : null;

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

    /* ---------- CALLBACK VALIDATION ---------- */
    if (status === "callback" && !callbackDate) {
      return NextResponse.json(
        { success: false, message: "Callback date is required" },
        { status: 400 }
      );
    }

    /* ---------- VERIFY STAFF ---------- */
    const staffSnap = await adminDb.collection("staff").doc(staffId).get();
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

    /* ---------- VERIFY LEAD ---------- */
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

    /* ---------- UPDATE STATUS (FINAL LOGIC) ---------- */
    const updateData: any = {
      status,
      lastUpdatedBy: staffId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // ✅ callback → save followupDate
    if (status === "callback") {
      updateData.followupDate = callbackDate;
    }

    // ✅ non-callback → clear followupDate
    if (status !== "callback" && leadData?.followupDate) {
      updateData.followupDate = admin.firestore.FieldValue.delete();
    }

    await leadRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: "Lead status updated successfully",
    });
  } catch (error) {
    console.error("❌ Lead status update error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update lead status" },
      { status: 500 }
    );
  }
}
