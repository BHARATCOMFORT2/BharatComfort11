export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization") || req.headers.get("Authorization")
    : (req as any).headers?.authorization || (req as any).headers?.Authorization;
}

export async function GET(req: Request) {
  try {
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

    // ✅ ✅ ✅ ONLY APPROVED TELECALLERS (STABLE OLD BEHAVIOR)
    const snap = await adminDb
      .collection("staff")
      .where("role", "==", "telecaller")
      .where("status", "==", "approved")
      .where("isActive", "==", true)
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
      data, // ✅ ARRAY — UI TUTEGI NAHI
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
