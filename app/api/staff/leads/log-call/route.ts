export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import admin from "firebase-admin";

/* ---------------- Helper ---------------- */
function getAuthHeader(req: Request) {
  return req.headers.get("authorization");
}

/* ---------------- POST ---------------- */
export async function POST(req: Request) {
  try {
    /* ---------- AUTH ---------- */
    const authHeader = getAuthHeader(req);
    if (!authHeader)
      return NextResponse.json(
        { success: false, message: "Missing Authorization" },
        { status: 401 }
      );

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match)
      return NextResponse.json(
        { success: false, message: "Invalid Authorization header" },
        { status: 401 }
      );

    const { adminAuth, adminDb } = getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(match[1], true);
    const staffId = decoded.uid;

    /* ---------- BODY ---------- */
    const { leadId, phone, outcome, note } = await req.json();

    if (!leadId)
      return NextResponse.json(
        { success: false, message: "leadId is required" },
        { status: 400 }
      );

    /* ---------- VERIFY STAFF ---------- */
    const staffSnap = await adminDb.collection("staff").doc(staffId).get();
    if (!staffSnap.exists)
      return NextResponse.json(
        { success: false, message: "Staff not found" },
        { status: 403 }
      );

    const staff = staffSnap.data()!;
    if (
      staff.role !== "telecaller" ||
      staff.status !== "approved" ||
      staff.isActive !== true
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized staff" },
        { status: 403 }
      );
    }

    /* ---------- VERIFY LEAD ---------- */
    const leadRef = adminDb.collection("leads").doc(leadId);
    const leadSnap = await leadRef.get();

    if (!leadSnap.exists)
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );

    const lead = leadSnap.data()!;
    if (lead.assignedTo !== staffId) {
      return NextResponse.json(
        { success: false, message: "Lead not assigned to you" },
        { status: 403 }
      );
    }

    /* ---------- CALL LOG ---------- */
    const callLog = {
      leadId,
      leadName: lead.name || lead.businessName || "",
      leadPhone: phone || lead.phone || "",

      staffId,
      staffName: staff.name || "",

      outcome: outcome || "dialed",
      note: note || "",

      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: "call",
    };

    /* ---------- SAVE LOG ---------- */
    await leadRef.collection("logs").add(callLog);

    /* ---------- UPDATE LEAD META ---------- */
    await leadRef.update({
      lastCalledAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdatedBy: staffId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Call log saved successfully",
    });
  } catch (err) {
    console.error("❌ Call log error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to save call log" },
      { status: 500 }
    );
  }
}
