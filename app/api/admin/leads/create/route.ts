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

// ✅ Allowed categories
const ALLOWED_CATEGORIES = [
  "hotel",
  "restaurant",
  "cafe",
  "dhaba",
  "guesthouse",
];

export async function POST(req: Request) {
  try {
    // ✅ TOKEN VERIFY (ADMIN)
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

    const adminId = decoded.uid;

    // ✅ VERIFY ADMIN
    const adminSnap = await adminDb.collection("admins").doc(adminId).get();
    if (!adminSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Admin access denied" },
        { status: 403 }
      );
    }

    // ✅ REQUEST BODY
    const body = await req.json();

    const {
      name,             // Lead / business name
      businessName,
      phone,
      email,
      contactPerson,
      address,
      city,
      category,         // hotel / restaurant / cafe / dhaba / guesthouse
      followupDate,     // "YYYY-MM-DD"
      assignedTo,       // staffId (telecaller)
      adminNote,
    } = body || {};

    // ✅ BASIC VALIDATION
    if (!name || !phone || !category || !followupDate || !assignedTo) {
      return NextResponse.json(
        {
          success: false,
          message:
            "name, phone, category, followupDate, assignedTo are required",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { success: false, message: "Invalid category" },
        { status: 400 }
      );
    }

    // ✅ VERIFY STAFF EXISTS & ACTIVE
    const staffSnap = await adminDb.collection("staff").doc(assignedTo).get();
    if (!staffSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Assigned staff not found" },
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
        { success: false, message: "Assigned staff is not active" },
        { status: 400 }
      );
    }

    // ✅ CREATE LEAD DOCUMENT
    const leadRef = await adminDb.collection("leads").add({
      name: String(name || "").trim(),
      businessName: String(businessName || "").trim(),
      phone: String(phone || "").trim(),
      email: String(email || "").trim(),
      contactPerson: String(contactPerson || "").trim(),
      address: String(address || "").trim(),
      city: String(city || "").trim(),

      category,
      status: "new",

      followupDate, // ✅ staff dashboard ka date filter yahin se chalega
      assignedTo,

      adminNote: String(adminNote || "").trim(),
      partnerNotes: "",

      notes: [],
      callLogs: [],

      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUpdatedBy: adminId,
    });

    return NextResponse.json({
      success: true,
      message: "✅ Lead created & assigned successfully",
      leadId: leadRef.id,
    });
  } catch (error: any) {
    console.error("ADMIN CREATE LEAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create lead",
      },
      { status: 500 }
    );
  }
}
