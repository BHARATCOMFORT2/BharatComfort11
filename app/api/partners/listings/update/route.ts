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

    const { id, title, description, price, location, metadata, status } = body;

    const ref = adminDb.collection("listings").doc(id);
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
