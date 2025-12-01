// app/api/admin/leads/assign/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

// ✅ Header helper (browser + server dono ke liye)
function getAuthHeader(req: Request) {
  const anyReq = req as any;
  if (anyReq.headers?.get) {
    return (
      anyReq.headers.get("authorization") ||
      anyReq.headers.get("Authorization")
    );
  }
  return anyReq.headers?.authorization || anyReq.headers?.Authorization;
}

export async function POST(req: Request) {
  try {
    // ✅ TOKEN VERIFY (sirf valid user check – koi admins collection nahi)
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
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    const actorId = decoded.uid || "system";

    // ✅ BODY PARSE
    const body = await req.json();
    const { leadId, staffId, adminNote, dueDate } = body || {};

    if (!leadId || !staffId) {
      return NextResponse.json(
        { success: false, message: "leadId and staffId are required" },
        { status: 400 }
      );
    }

    // ✅ LEAD CHECK
    const leadRef = adminDb.collection("leads").doc(leadId);
    const leadSnap = await leadRef.get();
    if (!leadSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    // ✅ STAFF CHECK (sirf existence – role/status check hata diya)
    const staffRef = adminDb.collection("staff").doc(staffId);
    const staffSnap = await staffRef.get();
    if (!staffSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Staff not found" },
        { status: 404 }
      );
    }

    // ✅ UPDATE PAYLOAD
    const updateData: any = {
      assignedTo: staffId,
      assignedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastUpdatedBy: actorId,
    };

    if (adminNote !== undefined) {
      updateData.adminNote = String(adminNote || "").trim();
    }

    if (dueDate) {
      const parsed = new Date(dueDate);
      if (!isNaN(parsed.getTime())) {
        updateData.dueDate = parsed;
      }
    }

    await leadRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: "Lead successfully assigned",
    });
  } catch (error: any) {
    console.error("Lead assignment error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Assignment failed",
      },
      { status: 500 }
    );
  }
}
