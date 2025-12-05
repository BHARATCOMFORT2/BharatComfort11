export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// app/api/partners/listings/update/route.ts

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
          error: "KYC not approved. You cannot update listings yet.",
          kycStatus: partner?.kycStatus || "NOT_STARTED",
        },
        { status: 403 }
      );
    }

    /* ✅ BODY */
    const body = await req.json().catch(() => null);
    if (!body)
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );

    const { id, title, description, price, location, metadata, status } = body;
    if (!id)
      return NextResponse.json(
        { success: false, error: "Listing id is required" },
        { status: 400 }
      );

    /* ✅ OWNERSHIP CHECK */
    const ref = adminDb.collection("listings").doc(id);
    const snap = await ref.get();
    if (!snap.exists)
      return NextResponse.json(
        { success: false, error: "Listing not found" },
        { status: 404 }
      );

    const docData = snap.data() || {};
    if (docData.partnerUid !== uid) {
      return NextResponse.json(
        { success: false, error: "Not authorized to update this listing" },
        { status: 403 }
      );
    }

    /* ✅ SAFE UPDATE */
    const update: any = { updatedAt: new Date() };
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (price !== undefined)
      update.price = typeof price === "number" ? price : Number(price) || 0;
    if (location !== undefined) update.location = location;
    if (metadata !== undefined) update.metadata = metadata;
    if (status !== undefined) update.status = status;

    await ref.update(update);

    return NextResponse.json({
      success: true,
      updated: update,
    });
  } catch (err: any) {
    console.error("❌ update listing error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
