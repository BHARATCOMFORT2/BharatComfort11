export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// app/api/partners/listings/delete/route.ts

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

function getAuthHeader(req: Request) {
  const h = (req as any).headers?.get
    ? (req as any).headers.get("authorization")
    : (req as any).headers?.authorization;
  return h || "";
}

export async function POST(req: Request) {
  try {
    /* ✅ AUTH */
    const authHeader = getAuthHeader(req);
    if (!authHeader)
      return NextResponse.json(
        { success: false, error: "Missing Authorization header" },
        { status: 401 }
      );

    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m)
      return NextResponse.json(
        { success: false, error: "Malformed Authorization header" },
        { status: 401 }
      );

    const idToken = m[1];
    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    /* ✅ ✅ KYC ENFORCEMENT */
    const partnerSnap = await adminDb.collection("partners").doc(uid).get();

    if (!partnerSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Partner profile not found" },
        { status: 403 }
      );
    }

    const partner = partnerSnap.data();

    if (partner?.kycStatus !== "APPROVED") {
      return NextResponse.json(
        {
          success: false,
          error: "KYC not approved. You cannot delete listings yet.",
          kycStatus: partner?.kycStatus || "NOT_STARTED",
        },
        { status: 403 }
      );
    }

    /* ✅ BODY */
    const body = await req.json().catch(() => null);
    if (!body || !body.id)
      return NextResponse.json(
        { success: false, error: "Listing id is required" },
        { status: 400 }
      );

    /* ✅ OWNERSHIP CHECK */
    const ref = adminDb.collection("listings").doc(body.id);
    const snap = await ref.get();
    if (!snap.exists)
      return NextResponse.json(
        { success: false, error: "Listing not found" },
        { status: 404 }
      );

    const docData = snap.data() || {};
    if (docData.partnerUid !== uid)
      return NextResponse.json(
        { success: false, error: "Not authorized to delete this listing" },
        { status: 403 }
      );

    /* ✅ SOFT DELETE */
    await ref.update({
      status: "deleted",
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

    // 🔁 If you ever want hard delete:
    // await ref.delete();

    return NextResponse.json({
      success: true,
      id: body.id,
    });
  } catch (err: any) {
    console.error("❌ delete listing error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
