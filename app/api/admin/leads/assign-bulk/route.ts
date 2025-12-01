export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

// ✅ Header helper (browser + server safe)
function getAuthHeader(req: Request) {
  const anyReq = req as any;
  if (anyReq.headers?.get) {
    return (
      anyReq.headers.get("authorization") ||
      anyReq.headers.get("Authorization")
    );
  }
  return anyReq.headers?.authorization || anyReq.headers?.Authorization;
}

export async function POST(req: Request) {
  try {
    // ✅ TOKEN VERIFY (sirf valid token — admins collection dependency hata di)
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

    const actorId = decoded.uid || "system";

    // ✅ BODY
    const body = await req.json();
    const { leadIds, staffId, adminNote } = body || {};

    if (!Array.isArray(leadIds) || leadIds.length === 0 || !staffId) {
      return NextResponse.json(
        { success: false, message: "leadIds (array) and staffId are required" },
        { status: 400 }
      );
    }

    // ✅ STAFF EXISTENCE CHECK (BAS ITNA HI KAafi HAI)
    const staffRef = adminDb.collection("staff").doc(staffId);
    const staffSnap = await staffRef.get();
    if (!staffSnap.exists) {
      return NextResponse.json(
        { success: false, message: "Staff not found" },
        { status: 404 }
      );
    }

    // ✅ BATCH UPDATE
    const batch = adminDb.batch();

    for (const leadId of leadIds) {
      const ref = adminDb.collection("leads").doc(leadId);

      batch.update(ref, {
        assignedTo: staffId,
        assignedAt: FieldValue.serverTimestamp(),
        adminNote: adminNote ? String(adminNote).trim() : "",
        updatedAt: FieldValue.serverTimestamp(),
        lastUpdatedBy: actorId,
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: "✅ Bulk assignment completed successfully",
      total: leadIds.length,
    });
  } catch (err: any) {
    console.error("ADMIN BULK ASSIGN ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Bulk assign failed",
      },
      { status: 500 }
    );
  }
}
