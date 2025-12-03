export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// ✅ Same safe auth helper
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

    // ✅ ✅ ✅ FETCH FROM staffRequests (PENDING ONLY)
    const snap = await adminDb
      .collection("staffRequests")
      .where("status", "==", "pending")
      .get();

    const data = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name || "",
        email: d.email || "",
        phone: d.phone || "",
        city: d.city || "",
        experience: d.experience || "",
        languages: d.languages || [],
        status: d.status || "pending",
        isActive: d.isActive || false,
      };
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    console.error("ADMIN PENDING STAFF ERROR:", err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Failed to fetch pending staff",
      },
      { status: 500 }
    );
  }
}
