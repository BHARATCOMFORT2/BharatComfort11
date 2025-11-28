// app/api/admin/staff/approve/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

// ✅ GET → Pending Staff List (users collection se)
export async function GET() {
  try {
    const { db: adminDb } = getFirebaseAdmin();

    const snapshot = await adminDb
      .collection("users")
      .where("role", "==", "staff")
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .get();

    const staffList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      data: staffList,
    });
  } catch (error: any) {
    console.error("Error fetching pending staff:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch pending staff",
      },
      { status: 500 }
    );
  }
}

// ✅ POST → Approve / Reject Staff (users doc update)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staffId, action } = body || {};

    if (!staffId || !action) {
      return NextResponse.json(
        {
          success: false,
          message: "staffId and action are required",
        },
        { status: 400 }
      );
    }

    const { db: adminDb } = getFirebaseAdmin();

    const staffRef = adminDb.collection("users").doc(staffId);
    const staffSnap = await staffRef.get();

    if (!staffSnap.exists) {
      return NextResponse.json(
        {
          success: false,
          message: "Staff not found",
        },
        { status: 404 }
      );
    }

    // ✅ APPROVE STAFF
    if (action === "approve") {
      await staffRef.update({
        status: "approved",
        isActive: true,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: "Staff approved successfully",
      });
    }

    // ❌ REJECT STAFF
    if (action === "reject") {
      await staffRef.update({
        status: "rejected",
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: "Staff rejected successfully",
      });
    }

    // ⚠️ Invalid action
    return NextResponse.json(
      {
        success: false,
        message: "Unknown action",
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error in staff approval:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while updating staff status",
      },
      { status: 500 }
    );
  }
}
