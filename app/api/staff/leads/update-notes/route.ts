export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import admin from "firebase-admin";

/* --------------------------------------------------
   AUTH HEADER HELPER
-------------------------------------------------- */
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

/* ==================================================
   POST — UPDATE LEAD NOTE (TELECALLER)
================================================== */
export async function POST(req: Request) {
  try {
    /* ---------------------------------------
       1️⃣ TOKEN VERIFY
    ---------------------------------------- */
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

    /* ---------------------------------------
       2️⃣ READ BODY (STRICT)
    ---------------------------------------- */
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { leadId, text } = body;
    const cleanText = String(text || "").trim();

    if (!leadId || !cleanText) {
      return NextResponse.json(
        { success: false, message: "leadId and text are required" },
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
       5️⃣ UPDATE LEAD (SAFE — NO ARRAY BLOAT)
    ---------------------------------------- */
    const now = admin.firestore.FieldValue.serverTimestamp();

    await leadRef.update({
      lastRemark: cleanText,          // ✅ latest note (fast access)
      partnerNotes: cleanText,        // ✅ backward compatibility
      lastUpdatedBy: staffId,
      updatedAt: now,
    });

    /* ---------------------------------------
       6️⃣ ACTIVITY LOG (SOURCE OF TRUTH)
    ---------------------------------------- */
    await leadRef.collection("logs").add({
      type: "note",
      text: cleanText,
      by: staffId,
      staffName: staffData?.name || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    /* ---------------------------------------
       7️⃣ RESPONSE
    ---------------------------------------- */
    return NextResponse.json({
      success: true,
      message: "Lead note saved successfully",
    });
  } catch (err) {
    console.error("❌ Lead note update error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to update lead note" },
      { status: 500 }
    );
  }
}
