// app/api/admin/leads/all/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// ✅ Same header helper
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization") || req.headers.get("Authorization")
    : (req as any).headers?.authorization || (req as any).headers?.Authorization;
}

export async function GET(req: Request) {
  try {
    // ✅ TOKEN VERIFY ONLY (admins collection check HATA DIYA)
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

    try {
      await adminAuth.verifyIdToken(m[1], true);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    // ✅ AB SIRF LEADS PADHNA – KOI EXTRA FILTER NAHI
    const snapshot = await adminDb
      .collection("leads")
      .orderBy("createdAt", "desc")
      .get();

    const leads = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name || "",
        businessName: d.businessName || "",
        phone: d.phone || "",
        email: d.email || "",
        contactPerson: d.contactPerson || "",

        category: d.category || "",
        status: d.status || "new",
        followupDate: d.followupDate || "",

        assignedTo: d.assignedTo || "",
        city: d.city || "",

        adminNote: d.adminNote || "",
        partnerNotes: d.partnerNotes || "",

        createdAt: d.createdAt || null,
        updatedAt: d.updatedAt || null,
        lastUpdatedBy: d.lastUpdatedBy || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: leads,
    });
  } catch (error: any) {
    console.error("ADMIN ALL LEADS FETCH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch all leads",
      },
      { status: 500 }
    );
  }
}
