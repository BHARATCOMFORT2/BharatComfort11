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

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    // ✅ PARAM VALIDATION
    const leadId = params?.id;
    if (!leadId) {
      return NextResponse.json(
        { success: false, message: "Lead ID is required" },
        { status: 400 }
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

    const d = leadSnap.data();

    // ✅ CONTROLLED RESPONSE (NO ACCIDENTAL LEAK)
    const lead = {
      id: leadSnap.id,

      name: d?.name || "",
      businessName: d?.businessName || "",
      phone: d?.phone || "",
      email: d?.email || "",
      contactPerson: d?.contactPerson || "",

      address: d?.address || "",
      city: d?.city || "",

      category: d?.category || "",
      status: d?.status || "new",
      followupDate: d?.followupDate || "",

      assignedTo: d?.assignedTo || "",
      adminNote: d?.adminNote || "",
      partnerNotes: d?.partnerNotes || "",

      notes: d?.notes || [],
      callLogs: d?.callLogs || [],

      createdAt: d?.createdAt || null,
      updatedAt: d?.updatedAt || null,
      lastUpdatedBy: d?.lastUpdatedBy || null,
    };

    return NextResponse.json({
      success: true,
      data: lead,
    });
  } catch (error: any) {
    console.error("ADMIN SINGLE LEAD FETCH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch lead details",
      },
      { status: 500 }
    );
  }
}
