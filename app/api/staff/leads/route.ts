export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { staffId } = body || {};

    if (!staffId) {
      return NextResponse.json(
        { success: false, message: "staffId is required" },
        { status: 400 }
      );
    }

    const { db: adminDb } = getFirebaseAdmin();

    // ✅ STAFF VALIDATION (SOURCE OF TRUTH)
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

    // ✅ ✅ ✅ FETCH ASSIGNED LEADS
    const snapshot = await adminDb
      .collection("leads")
      .where("assignedTo", "==", staffId)
      .get();

    const leads = snapshot.docs.map((doc) => {
      const d = doc.data();

      return {
        id: doc.id,

        // ✅ Dashboard required fields
        name: d.name || "",
        businessName: d.businessName || "",
        contactPerson: d.contactPerson || "",

        // ✅ ✅ ✅ PHONE FIX (all possible names)
        phone: d.phone || d.mobile || d.contact || "",

        // ✅ ✅ ✅ ADDRESS FIX (now dashboard will show it)
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

    console.log("✅ TELECALLER LEADS FOUND:", leads.length);

    // ✅ ✅ ✅ IMPORTANT: frontend `data.leads` expect karta hai
    return NextResponse.json({
      success: true,
      leads,   // ❗❗❗ NOT `data`
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
