// app/api/admin/leads/update-task-fields/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leadId, adminNote, dueDate } = body || {};

    if (!leadId) {
      return NextResponse.json(
        {
          success: false,
          message: "leadId is required",
        },
        { status: 400 }
      );
    }

    const { db: adminDb } = getFirebaseAdmin();

    // ✅ Check Lead Exists
    const leadRef = adminDb.collection("leads").doc(leadId);
    const leadSnap = await leadRef.get();

    if (!leadSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead not found",
        },
        { status: 404 }
      );
    }

    // ✅ Prepare update payload
    const updateData: any = {
      adminNote: adminNote ? String(adminNote).trim() : "",
      updatedAt: FieldValue.serverTimestamp(),
    };

    // ✅ Optional dueDate
    if (dueDate) {
      const parsed = new Date(dueDate);
      if (!isNaN(parsed.getTime())) {
        updateData.dueDate = parsed;
      }
    } else {
      updateData.dueDate = null; // allow admin to clear due date
    }

    // ✅ Update Firestore
    await leadRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: "Task fields updated successfully",
    });
  } catch (error: any) {
    console.error("Update task fields error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Something went wrong while updating task fields",
      },
      { status: 500 }
    );
  }
}
