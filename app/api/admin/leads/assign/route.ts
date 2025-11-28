// app/api/admin/leads/assign/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leadId, staffId, adminNote, dueDate } = body || {};

    if (!leadId || !staffId) {
      return NextResponse.json(
        { success: false, message: "leadId and staffId are required" },
        { status: 400 }
      );
    }

    const { db: adminDb } = getFirebaseAdmin();

    const leadRef = adminDb.collection("leads").doc(leadId);
    const leadSnap = await leadRef.get();
    if (!leadSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

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
        { success: false, message: "Staff is not active telecaller" },
        { status: 400 }
      );
    }

    const updateData: any = {
      assignedTo: staffId,
      assignedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (adminNote) updateData.adminNote = adminNote;
    if (dueDate) updateData.dueDate = new Date(dueDate);

    await leadRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: "Lead successfully assigned to telecaller",
    });
  } catch (error: any) {
    console.error("Lead assignment error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Assignment failed" },
      { status: 500 }
    );
  }
}
