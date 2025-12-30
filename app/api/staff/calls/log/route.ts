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
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Missing Authorization" },
        { status: 401 }
      );
    }

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return NextResponse.json(
        { success: false, message: "Invalid Authorization header" },
        { status: 401 }
      );
    }

    const { adminAuth, adminDb } = getFirebaseAdmin();
    const decoded = await adminAuth.verifyIdToken(match[1], true);
    const staffId = decoded.uid;

    /* ---------- BODY ---------- */
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { leadId, phone, outcome, note } = body;
    if (!leadId) {
      return NextResponse.json(
        { success: false, message: "leadId is required" },
        { status: 400 }
      );
    }

    /* ---------- VERIFY STAFF ---------- */
    const staffSnap = await adminDb.collection("staff").doc(staffId).get();
    if (!staffSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Staff not found" },
        { status: 403 }
      );
    }

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

    if (!leadSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    const lead = leadSnap.data()!;
    if (lead.assignedTo !== staffId) {
      return NextResponse.json(
        { success: false, message: "Lead not assigned to you" },
        { status: 403 }
      );
    }

    /* ---------- CALL LOG (SINGLE SOURCE) ---------- */
    const callLog = {
      by: staffId,
      staffName: staff.name || "",
      phone: phone || lead.phone || lead.mobile || "",
      outcome: outcome || "dialed",
      note: note || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    /* ---------- SAVE TO LEAD DOCUMENT ---------- */
    await leadRef.update({
      callLogs: admin.firestore.FieldValue.arrayUnion(callLog),

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
