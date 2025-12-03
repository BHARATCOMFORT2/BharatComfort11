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

    // ✅ ✅ ✅ CORRECT SOURCE: staffRequests
    const requestRef = adminDb.collection("staffRequests").doc(staffId);
    const requestSnap = await requestRef.get();

    if (!requestSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Staff request not found" },
        { status: 404 }
      );
    }

    const requestData = requestSnap.data();

    // ✅ ✅ ✅ APPROVE FLOW
    if (action === "approve") {
      // 1️⃣ Create in real staff collection
      await adminDb.collection("staff").doc(staffId).set({
        ...requestData,

        status: "approved",
        isActive: true,

        approvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 2️⃣ Remove from staffRequests
      await requestRef.delete();

      return NextResponse.json({
        success: true,
        message: "✅ Staff approved and activated successfully",
      });
    }

    // ✅ ✅ ✅ REJECT FLOW
    if (action === "reject") {
      await requestRef.update({
        status: "rejected",
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: "❌ Staff rejected successfully",
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
