export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// ✅ Safe header helper
function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization") || req.headers.get("Authorization")
    : (req as any).headers?.authorization || (req as any).headers?.Authorization;
}

export async function GET(req: Request) {
  try {
    // ✅ TOKEN VERIFY
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

    try {
      await adminAuth.verifyIdToken(m[1], true);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    // ✅ ✅ ✅ 1️⃣ PENDING FROM staffRequests
    const pendingSnap = await adminDb
      .collection("staffRequests")
      .where("status", "==", "pending")
      .get();

    const pending = pendingSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name || "",
        email: d.email || "",
        phone: d.phone || "",
        city: d.city || "",
        experience: d.experience || "",
        languages: d.languages || [],
        status: "pending",
        isActive: false,
        type: "pending", // ✅ FOR UI
      };
    });

    // ✅ ✅ ✅ 2️⃣ APPROVED FROM staff
    const approvedSnap = await adminDb
      .collection("staff")
      .where("role", "==", "telecaller")
      .where("status", "==", "approved")
      .where("isActive", "==", true)
      .get();

    const approved = approvedSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name || "",
        email: d.email || "",
        phone: d.phone || "",
        city: d.city || "",
        experience: d.experience || "",
        languages: d.languages || [],
        status: "approved",
        isActive: true,
        type: "approved", // ✅ FOR UI
      };
    });

    // ✅ ✅ ✅ COMBINED RESPONSE (ONE UI)
    return NextResponse.json({
      success: true,
      data: {
        pending,
        approved,
        totalPending: pending.length,
        totalApproved: approved.length,
      },
    });
  } catch (err: any) {
    console.error("ADMIN STAFF LIST ERROR:", err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Failed to fetch staff list",
      },
      { status: 500 }
    );
  }
}
