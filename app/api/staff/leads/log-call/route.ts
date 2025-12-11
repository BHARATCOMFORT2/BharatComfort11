export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import admin from "firebase-admin";

// Helper
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    const authHeader = getAuthHeader(req);
    if (!authHeader)
      return NextResponse.json({ success: false, message: "Missing Authorization" }, { status: 401 });

    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m)
      return NextResponse.json({ success: false, message: "Bad Authorization header" }, { status: 401 });

    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(m[1], true);
    const staffId = decoded.uid;

    // Read body
    const body = await req.json();
    const { leadId, phone, outcome, note } = body || {};
    if (!leadId)
      return NextResponse.json({ success: false, message: "leadId is required" }, { status: 400 });

    // Verify staff
    const staffRef = adminDb.collection("staff").doc(staffId);
    const staffSnap = await staffRef.get();
    const staff = staffSnap.data();

    if (
      !staffSnap.exists ||
      staff.role !== "telecaller" ||
      staff.status !== "approved" ||
      staff.isActive !== true
    ) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    // Verify lead ownership
    const leadRef = adminDb.collection("leads").doc(leadId);
    const leadSnap = await leadRef.get();
    const lead = leadSnap.data();

    if (!leadSnap.exists)
      return NextResponse.json({ success: false, message: "Lead not found" }, { status: 404 });

    if (lead.assignedTo !== staffId)
      return NextResponse.json({ success: false, message: "Lead not assigned to you" }, { status: 403 });

    // Build call log data
    const now = new Date();

    const callData = {
      phone: String(phone || "").trim() || null,
      outcome: String(outcome || "").trim() || null,
      note: String(note || "").trim() || null,
      calledBy: staffId,
      createdAt: now,
      type: "call_log",
    };

    // ⭐ 1) Append call log to ARRAY
    await leadRef.update({
      callLogs: admin.firestore.FieldValue.arrayUnion(callData),
      lastCalledAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdatedBy: staffId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ⭐ 2) ADD ENTRY TO SUBCOLLECTION (for admin timeline)
    await leadRef
      .collection("logs")
      .add({
        ...callData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        staffName: staff.name || "",
      });

    return NextResponse.json({
      success: true,
      message: "Call log saved + activity timeline updated",
    });
  } catch (error: any) {
    console.error("❌ Lead call log error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to save call log" },
      { status: 500 }
    );
  }
}
