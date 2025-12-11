export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import admin from "firebase-admin";

// Auth header helper
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    // TOKEN VERIFY
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
    const decoded = await adminAuth.verifyIdToken(m[1], true);
    const staffId = decoded.uid;

    // BODY
    const body = await req.json();
    const { leadId, text, note } = body || {};

    const cleanText = (text ?? note ?? "").toString().trim();

    if (!leadId || !cleanText) {
      return NextResponse.json(
        { success: false, message: "leadId and note/text are required" },
        { status: 400 }
      );
    }

    // VERIFY STAFF
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

    // VERIFY LEAD OWNERSHIP
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

    // NOTE OBJECT
    const now = admin.firestore.FieldValue.serverTimestamp();
    const noteObj = {
      text: cleanText,
      addedBy: staffId,
      createdAt: now,
    };

    // ------------------------------------------------------------
    // ✅ UPDATE NOTES ARRAY + LAST REMARK
    // ------------------------------------------------------------
    await leadRef.update({
      notes: admin.firestore.FieldValue.arrayUnion(noteObj),
      partnerNotes: cleanText,
      lastRemark: cleanText,
      lastUpdatedBy: staffId,
      updatedAt: now,
    });

    // ------------------------------------------------------------
    // ✅ ADD TO ACTIVITY LOGS SUBCOLLECTION
    // ------------------------------------------------------------
    await leadRef.collection("logs").add({
      type: "note",
      text: cleanText,
      by: staffId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Lead note saved successfully",
    });
  } catch (err) {
    console.error("Lead note update error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to update lead note" },
      { status: 500 }
    );
  }
}
