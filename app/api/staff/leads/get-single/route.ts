export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

// ✅ Helper to safely convert Firestore Timestamp → ISO string
function safeDate(val: any) {
  try {
    if (!val) return null;
    if (typeof val === "string") return val;
    if (val.toDate) return val.toDate().toISOString();
    return new Date(val).toISOString();
  } catch {
    return null;
  }
}

// ✅ Convert notes safely
function safeNotes(notes: any[]) {
  if (!Array.isArray(notes)) return [];
  return notes.map((n) => ({
    text: n?.text || "",
    addedBy: n?.addedBy || null,
    createdAt: safeDate(n?.createdAt),
  }));
}

// ✅ Convert call logs safely
function safeCallLogs(logs: any[]) {
  if (!Array.isArray(logs)) return [];
  return logs.map((c) => ({
    phone: c?.phone || "",
    outcome: c?.outcome || "",
    note: c?.note || "",
    calledBy: c?.calledBy || "",
    createdAt: safeDate(c?.createdAt),
  }));
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
        { success: false, message: "You are not assigned to this lead" },
        { status: 403 }
      );
    }

    // ✅ ✅ ✅ FINAL SAFE RESPONSE
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

      dueDate: safeDate(leadData?.dueDate),
      lastCalledAt: safeDate(leadData?.lastCalledAt),

      notes: safeNotes(leadData?.notes || []),       // ✅ SAFE NOTES
      callLogs: safeCallLogs(leadData?.callLogs || []), // ✅ SAFE CALL LOGS

      assignedTo: leadData?.assignedTo || "",
      createdAt: safeDate(leadData?.createdAt),
      updatedAt: safeDate(leadData?.updatedAt),
      lastUpdatedBy: leadData?.lastUpdatedBy || null,
    };

    return NextResponse.json({
      success: true,
      lead,
    });
  } catch (error: any) {
    console.error("❌ Get single lead error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch lead details",
      },
      { status: 500 }
    );
  }
}
