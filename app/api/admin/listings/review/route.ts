// app/api/admin/listings/review/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

function getAuthHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    const authHeader = getAuthHeader(req);
    if (!authHeader)
      return NextResponse.json({ error: "Missing Authorization" }, { status: 401 });

    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m)
      return NextResponse.json({ error: "Malformed header" }, { status: 401 });

    const token = m[1];

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(token, true);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (!decoded.admin)
      return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json();
    const { listingId, action, reason } = body;

    if (!listingId || !action)
      return NextResponse.json({ error: "Missing params" }, { status: 400 });

    const ref = adminDb.collection("listings").doc(listingId);
    const snap = await ref.get();

    if (!snap.exists)
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });

    const update: any = { updatedAt: new Date() };

    if (action === "approve") {
      update["moderation.status"] = "approved";
      update["moderation.reason"] = null;
      update["moderation.reviewedBy"] = decoded.uid;
      update["moderation.reviewedAt"] = new Date();
    } else if (action === "reject") {
      update["moderation.status"] = "rejected";
      update["moderation.reason"] = reason || "Rejected by admin";
      update["moderation.reviewedBy"] = decoded.uid;
      update["moderation.reviewedAt"] = new Date();
    } else if (action === "feature") {
      update["featured"] = true;
    } else if (action === "unfeature") {
      update["featured"] = false;
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    await ref.update(update);
    return NextResponse.json({ ok: true, updated: update });
  } catch (err: any) {
    console.error("admin listing review:", err);
    return NextResponse.json(
      { error: err.message || "Internal" },
      { status: 500 }
    );
  }
}
