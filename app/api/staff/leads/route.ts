// app/api/staff/leads/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// ✅ Telecaller → Apni assigned leads fetch karega
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staffId } = body || {};

    if (!staffId) {
      return NextResponse.json(
        {
          success: false,
          message: "staffId is required",
        },
        { status: 400 }
      );
    }

    const { db: adminDb } = getFirebaseAdmin();

    // ✅ Check staff exists & is approved
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
        {
          success: false,
          message: "Unauthorized staff access",
        },
        { status: 403 }
      );
    }

    // ✅ Fetch only assigned leads
    const snapshot = await adminDb
      .collection("leads")
      .where("assignedTo", "==", staffId)
      .orderBy("createdAt", "desc")
      .get();

    const leads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      data: leads,
    });
  } catch (error: any) {
    console.error("Telecaller leads fetch error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch assigned leads",
      },
      { status: 500 }
    );
  }
}
