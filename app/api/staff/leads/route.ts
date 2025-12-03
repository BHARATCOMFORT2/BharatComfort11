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
    // ✅ TOKEN VERIFY (PERMANENT FIX #1)
    const authHeader = getAuthHeader(req);
    if (!authHeader)
      return NextResponse.json(
        { success: false, message: "Missing Authorization" },
        { status: 401 }
      );

    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m)
      return NextResponse.json(
        { success: false, message: "Bad Authorization header" },
        { status: 401 }
      );

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

    // ✅ ✅ ✅ REAL STAFF ID FROM TOKEN
    const staffId = decoded.uid;

    const body = await req.json();
    const {
      status,
      range,
      fromDate,
      toDate,
    } = body || {};

    // ✅ STAFF VALIDATION
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

    // ✅ ✅ ✅ BASE QUERY (PERMANENT FIX #2)
    let query: FirebaseFirestore.Query = adminDb
      .collection("leads")
      .where("assignedTo", "==", staffId);

    // ✅ STATUS FILTER
    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }

    // ✅ DATE FILTER LOGIC
    const now = new Date();

    if (range === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      query = query
        .where("createdAt", ">=", start)
        .where("createdAt", "<=", now);
    }

    if (range === "7days") {
      const last7 = new Date();
      last7.setDate(last7.getDate() - 7);

      query = query.where("createdAt", ">=", last7);
    }

    if (range === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      query = query.where("createdAt", ">=", firstDay);
    }

    if (range === "custom" && fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);

      query = query
        .where("createdAt", ">=", from)
        .where("createdAt", "<=", to);
    }

    // ✅ ✅ ✅ EXECUTE QUERY (NO orderBy — INDEX SAFE)
    const snapshot = await query.get();

    const leads = snapshot.docs.map((doc) => {
      const d = doc.data();

      return {
        id: doc.id,

        name: d.name || "",
        businessName: d.businessName || "",
        contactPerson: d.contactPerson || "",

        phone: d.phone || d.mobile || d.contact || "",
        address: d.address || d.city || d.location || "",

        email: d.email || "",
        category: d.category || "",

        status: d.status || "new",
        followupDate: d.followupDate || "",
        dueDate: d.dueDate || null,

        assignedTo: d.assignedTo || "",

        adminNote: d.adminNote || "",
        partnerNotes: d.partnerNotes || "",

        createdAt: d.createdAt || null,
        updatedAt: d.updatedAt || null,
      };
    });

    console.log("✅ FINAL SAFE TELECALLER LEADS:", leads.length);

    return NextResponse.json({
      success: true,
      data: leads,
    });
  } catch (error: any) {
    console.error("❌ Telecaller leads fetch error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch assigned leads",
      },
      { status: 500 }
    );
  }
}
