// app/api/staff/leads/update-status/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staffId, leadId, status } = body || {};

    if (!staffId || !leadId || !status) {
      return NextResponse.json(
        {
          success: false,
          message: "staffId, leadId and status are required",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUS.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid status value",
        },
        { status: 400 }
      );
    }

    const { db: adminDb } = getFirebaseAdmin();

    // ✅ Verify Lead Exists & Assigned to This Staff
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
        {
          success: false,
          message: "You are not assigned to this lead",
        },
        { status: 403 }
      );
    }

    // ✅ Update Status
    await leadRef.update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Lead status updated successfully",
    });
  } catch (error: any) {
    console.error("Lead status update error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update lead status",
      },
      { status: 500 }
    );
  }
}
