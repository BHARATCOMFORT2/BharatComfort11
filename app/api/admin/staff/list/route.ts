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
    // ✅ ADMIN TOKEN VERIFY (ROLE SE)
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

    // ✅ ✅ ✅ ONLY ROLE CHECK (NO admins COLLECTION)
    if (!["admin", "superadmin"].includes(decoded.role)) {
      return NextResponse.json(
        { success: false, message: "Admin access denied" },
        { status: 403 }
      );
    }

    // ✅ FETCH ONLY ACTIVE TELECALLERS
    const snap = await adminDb
      .collection("staff")
      .where("role", "==", "telecaller")
      .where("status", "==", "approved")
      .where("isActive", "==", true)
      .orderBy("createdAt", "desc")
      .get();

    const data = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name || "",
        email: d.email || "",
        phone: d.phone || "",
        role: d.role || "",
        status: d.status || "",
        isActive: d.isActive || false,
      };
    });

    return NextResponse.json({
      success: true,
      data,
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
