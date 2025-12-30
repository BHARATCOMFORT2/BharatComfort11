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
    /* ---------------------------------------
       1️⃣ TOKEN VERIFY (SAFE)
    ---------------------------------------- */
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

    // 🔥 IMPORTANT FIX: revocation check OFF
    const decoded = await adminAuth.verifyIdToken(tokenMatch[1]);
    const staffId = decoded.uid;

    /* ---------------------------------------
       2️⃣ READ BODY
    ---------------------------------------- */
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { leadId, status, callbackDate } = body;

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

    /* ---------------------------------------
       3️⃣ VERIFY STAFF
    ---------------------------------------- */
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
        { success: false, message: "Unauthorized staff access" },
        { status: 403 }
      );
    }

    /* ---------------------------------------
       4️⃣ VERIFY LEAD OWNERSHIP
    ---------------------------------------- */
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

    /* ---------------------------------------
       5️⃣ PREPARE FOLLOW-UP DATE (CRITICAL FIX)
    ---------------------------------------- */
    let followupTs: admin.firestore.Timestamp | null = null;
    if (status === "callback") {
      const d = new Date(callbackDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          { success: false, message: "Invalid callbackDate" },
          { status: 400 }
        );
      }
      followupTs = admin.firestore.Timestamp.fromDate(d);
    }

    /* ---------------------------------------
       6️⃣ UPDATE STATUS (FINAL)
    ---------------------------------------- */
    await leadRef.update({
      status,
      followupDate: followupTs,
      lastUpdatedBy: staffId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),

      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status,
        by: staffId,
        staffName: staffData?.name || "",
        callbackDate: followupTs,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }),
    });

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
