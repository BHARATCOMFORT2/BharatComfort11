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
    // ✅ ADMIN TOKEN VERIFY
    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Missing Authorization" },
        { status: 401 }
      );
    }

    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m) {
      return NextResponse.json(
        { success: false, message: "Bad Authorization header" },
        { status: 401 }
      );
    }

    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(m[1], true);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid admin token" },
        { status: 401 }
      );
    }

    const adminId = decoded.uid;

    // ✅ VERIFY ADMIN FROM FIRESTORE (SOURCE OF TRUTH)
    const adminSnap = await adminDb.collection("admins").doc(adminId).get();
    if (!adminSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Admin access denied" },
        { status: 403 }
      );
    }

    // ✅ REQUEST BODY
    const body = await req.json();
    const { leadId, adminNote, dueDate } = body || {};

    if (!leadId) {
      return NextResponse.json(
        { success: false, message: "leadId is required" },
        { status: 400 }
      );
    }

    // ✅ VERIFY LEAD
    const leadRef = adminDb.collection("leads").doc(leadId);
    const leadSnap = await leadRef.get();

    if (!leadSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    // ✅ PREPARE UPDATE PAYLOAD
    const updateData: any = {
      adminNote: adminNote ? String(adminNote).trim() : "",
      updatedAt: new Date(),
      lastUpdatedBy: adminId, // ✅ TRACK WHICH ADMIN UPDATED
    };

    // ✅ Optional dueDate
    if (dueDate !== undefined) {
      if (dueDate) {
        const parsed = new Date(dueDate);
        if (!isNaN(parsed.getTime())) {
          updateData.dueDate = parsed;
        }
      } else {
        updateData.dueDate = null; // ✅ allow admin to clear due date
      }
    }

    // ✅ UPDATE FIRESTORE
    await leadRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: "✅ Task fields updated successfully",
    });
  } catch (error: any) {
    console.error("ADMIN UPDATE TASK FIELDS ERROR:", error);

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
