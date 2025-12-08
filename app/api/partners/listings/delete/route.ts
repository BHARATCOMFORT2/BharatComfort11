export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

function getAuthHeader(req: Request) {
  return req.headers.get("authorization") || "";
}

export async function POST(req: Request) {
  try {
    /* ✅ AUTH */
    const authHeader = getAuthHeader(req);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const idToken = authHeader.replace("Bearer ", "").trim();
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    const uid = decoded.uid;

    /* ✅ BODY */
    const body = await req.json().catch(() => null);
    if (!body || !body.id) {
      return NextResponse.json(
        { success: false, error: "Listing id is required" },
        { status: 400 }
      );
    }

    const ref = adminDb.collection("listings").doc(body.id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: "Listing not found" },
        { status: 404 }
      );
    }

    const docData = snap.data() || {};

    /* ✅ ✅ ✅ FINAL OPTION-B OWNERSHIP CHECK */
    const ownerId =
      docData.partnerId ||
      docData?.metadata?.partnerId ||
      docData?.partner?.uid;

    if (ownerId !== uid) {
      return NextResponse.json(
        { success: false, error: "Not authorized to delete this listing" },
        { status: 403 }
      );
    }

    /* ✅ SOFT DELETE */
    await ref.update({
      status: "deleted",
      deletedAt: new Date(),
      updatedAt: new Date(),
    });

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
