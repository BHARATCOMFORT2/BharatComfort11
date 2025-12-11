// app/api/admin/staff/toggle-active/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const { auth: adminAuth, db: adminDb } = getFirebaseAdmin();

    const authHeader = req.headers.get("authorization") || "";
    const m = authHeader.match(/^Bearer (.+)$/);
    if (!m) return NextResponse.json({ success: false, message: "Missing Authorization" }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(m[1], true);
    const callerUid = decoded.uid;

    // caller must be admin/superadmin
    const callerSnap = await adminDb.collection("staff").doc(callerUid).get();
    const caller = callerSnap.exists ? callerSnap.data() : null;
    if (!(caller && (caller.role === "admin" || caller.role === "superadmin"))) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { staffId, isActive } = body || {};
    if (!staffId || typeof isActive !== "boolean") return NextResponse.json({ success: false, message: "staffId and isActive required" }, { status: 400 });

    const staffRef = adminDb.collection("staff").doc(staffId);
    const snap = await staffRef.get();
    if (!snap.exists) return NextResponse.json({ success: false, message: "Staff not found" }, { status: 404 });

    await staffRef.update({
      isActive,
      updatedAt: new Date(),
      updatedBy: callerUid,
    });

    return NextResponse.json({ success: true, message: `Staff ${isActive ? "activated" : "deactivated"}` });
  } catch (err: any) {
    console.error("toggle active error:", err);
    return NextResponse.json({ success: false, message: "Failed to toggle active" }, { status: 500 });
  }
}
