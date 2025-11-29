// app/api/admin/partners/reject/route.ts

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";

/**
 * ✅ Admin: Reject Partner KYC (Production Safe)
 * Body: { partnerId: string; reason: string }
 */
export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin } = getFirebaseAdmin();

    // -----------------------------------
    // 1) Verify Session Cookie
    // -----------------------------------
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("__session="))
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated (no session)" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired admin session" },
        { status: 401 }
      );
    }

    // ✅ STRICT ADMIN ROLE CHECK
    const adminSnap = await adminDb
      .collection("users")
      .doc(decoded.uid)
      .get();

    if (!adminSnap.exists || adminSnap.data()?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // -----------------------------------
    // 2) Parse Request Body
    // -----------------------------------
    const body = await req.json().catch(() => ({}));
    const partnerId = body?.partnerId;
    const reason = body?.reason;

    if (!partnerId || !reason) {
      return NextResponse.json(
        { error: "partnerId and reason are required" },
        { status: 400 }
      );
    }

    // -----------------------------------
    // 3) Fetch Partner Document
    // -----------------------------------
    const partnerRef = adminDb.collection("partners").doc(partnerId);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const partner = partnerSnap.data() || {};
    const partnerUid = partner.uid || partnerId;

    // ✅ BLOCK DOUBLE REJECTION
    if (
      partner.status === "REJECTED" ||
      partner.kycStatus === "REJECTED" ||
      partner.kyc?.status === "REJECTED"
    ) {
      return NextResponse.json(
        { error: "Partner already rejected" },
        { status: 409 }
      );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const adminUid = decoded.uid;

    // -----------------------------------
    // 4) Update Partner Document (REJECT)
    // -----------------------------------
    await partnerRef.update({
      status: "REJECTED",
      approved: false,
      kycStatus: "REJECTED",
      "kyc.status": "REJECTED",
      kycRejectedAt: now,
      kycRejectionReason: reason,
      rejectedBy: adminUid,
      updatedAt: now,
    });

    // -----------------------------------
    // 5) Log Rejection Event
    // -----------------------------------
    await adminDb.collection("partnerApprovals").add({
      partnerId,
      partnerUid,
      adminId: adminUid,
      action: "reject",
      reason,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      message: "❌ Partner KYC rejected successfully",
    });
  } catch (err: any) {
    console.error("Admin Partner Reject Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
