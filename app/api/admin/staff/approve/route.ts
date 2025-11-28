// app/api/admin/staff/approve/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staffId, action } = body;

    // ✅ Validation
    if (!staffId || !action) {
      return NextResponse.json(
        { success: false, message: "staffId & action required" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Invalid action" },
        { status: 400 }
      );
    }

    const { db: adminDb } = getFirebaseAdmin();

    // ✅ REAL STAFF COLLECTION
    const ref = adminDb.collection("staff").doc(staffId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { success: false, message: "Staff not found" },
        { status: 404 }
      );
    }

    // ✅ APPROVE
    if (action === "approve") {
      await ref.update({
        status: "approved",
        isActive: true,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: "Staff approved successfully",
      });
    }

    // ✅ REJECT
    if (action === "reject") {
      await ref.update({
        status: "rejected",
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: "Staff rejected successfully",
      });
    }

  } catch (err: any) {
    console.error("Approve Staff Error:", err);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Failed to update staff status",
      },
      { status: 500 }
    );
  }
}
