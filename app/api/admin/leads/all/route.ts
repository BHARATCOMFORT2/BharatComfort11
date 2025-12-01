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

export async function GET(req: Request) {
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

    // ✅ FETCH ALL LEADS (SAFE)
    const snapshot = await adminDb
      .collection("leads")
      .orderBy("createdAt", "desc")
      .get();

    const leads = snapshot.docs.map((doc) => ({
      id: doc.id,

      // ✅ Controlled expose (no accidental sensitive leak)
      name: doc.data().name || "",
      businessName: doc.data().businessName || "",
      phone: doc.data().phone || "",
      email: doc.data().email || "",
      contactPerson: doc.data().contactPerson || "",

      category: doc.data().category || "",
      status: doc.data().status || "new",
      followupDate: doc.data().followupDate || "",

      assignedTo: doc.data().assignedTo || "",
      city: doc.data().city || "",

      adminNote: doc.data().adminNote || "",
      partnerNotes: doc.data().partnerNotes || "",

      createdAt: doc.data().createdAt || null,
      updatedAt: doc.data().updatedAt || null,
      lastUpdatedBy: doc.data().lastUpdatedBy || null,
    }));

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
