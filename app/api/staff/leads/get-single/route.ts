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
    // ✅ TOKEN VERIFY
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

    const staffId = decoded.uid;

    const body = await req.json();
    const { leadId } = body || {};

    if (!leadId) {
      return NextResponse.json(
        { success: false, message: "leadId is required" },
        { status: 400 }
      );
    }

    // ✅ VERIFY STAFF
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

    // ✅ FETCH LEAD
    const leadRef = adminDb.collection("leads").doc(leadId);
    const leadSnap = await leadRef.get();

    if (!leadSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    const leadData = leadSnap.data();

    // ✅ VERIFY LEAD OWNERSHIP
    if (leadData?.assignedTo !== staffId) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not assigned to this lead",
        },
        { status: 403 }
      );
    }

    // ✅ FINAL RESPONSE OBJECT
    const lead = {
      id: leadSnap.id,

      name: leadData?.name || "",
      businessName: leadData?.businessName || "",
      address: leadData?.address || "",
      city: leadData?.city || "",

      phone: leadData?.phone || "",
      email: leadData?.email || "",
      contactPerson: leadData?.contactPerson || "",

      category: leadData?.category || "",
      status: leadData?.status || "new",
      followupDate: leadData?.followupDate || "",

      adminNote: leadData?.adminNote || "",
      partnerNotes: leadData?.partnerNotes || "",

      dueDate: leadData?.dueDate || null,
      lastCalledAt: leadData?.lastCalledAt || null,

      notes: leadData?.notes || [],       // ✅ FULL NOTES HISTORY
      callLogs: leadData?.callLogs || [], // ✅ FULL CALL HISTORY

      assignedTo: leadData?.assignedTo || "",
      createdAt: leadData?.createdAt || null,
      updatedAt: leadData?.updatedAt || null,
      lastUpdatedBy: leadData?.lastUpdatedBy || null,
    };

    return NextResponse.json({
      success: true,
      lead,
    });
  } catch (error: any) {
    console.error("Get single lead error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch lead details",
      },
      { status: 500 }
    );
  }
}
