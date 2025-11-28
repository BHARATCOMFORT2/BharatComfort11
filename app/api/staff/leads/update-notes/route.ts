// app/api/staff/leads/update-notes/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staffId, leadId, partnerNotes } = body || {};

    if (!staffId || !leadId || !partnerNotes) {
      return NextResponse.json(
        {
          success: false,
          message: "staffId, leadId and partnerNotes are required",
        },
        { status: 400 }
      );
    }

    const { db: adminDb } = getFirebaseAdmin();

    // ✅ Verify Lead Exists
    const leadRef = adminDb.collection("leads").doc(leadId);
    const leadSnap = await leadRef.get();

    if (!leadSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    const leadData = leadSnap.data();

    // ✅ Security: Lead must be assigned to this staff
    if (leadData?.assignedTo !== staffId) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not assigned to this lead",
        },
        { status: 403 }
      );
    }

    // ✅ Update Partner Notes
    await leadRef.update({
      partnerNotes: String(partnerNotes).trim(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Partner notes updated successfully",
    });
  } catch (error: any) {
    console.error("Partner notes update error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update partner notes",
      },
      { status: 500 }
    );
  }
}
