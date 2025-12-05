// app/api/admin/partners/reject/route.ts

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * ✅ Admin: Reject Partner KYC (Aligned with New KYC System)
 * Body: { partnerId: string; reason: string }
 */
export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin } = getFirebaseAdmin();

    // -----------------------------------
    // 1) Verify Admin Session
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
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decoded?.uid) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    // ✅ Confirm admin from Firestore
    const adminSnap = await adminDb
      .collection("users")
      .doc(decoded.uid)
      .get();

    if (!adminSnap.exists || adminSnap.data()?.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
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
        { success: false, error: "partnerId and reason are required" },
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
        { success: false, error: "Partner not found" },
        { status: 404 }
      );
    }

    const partner = partnerSnap.data() || {};
    const partnerUid = partner.uid || partnerId;

    const currentKycStatus = String(partner.kycStatus || "").toUpperCase();

    // ✅ Block invalid transitions
    if (currentKycStatus === "REJECTED") {
      return NextResponse.json(
        { success: false, error: "Partner already rejected" },
        { status: 409 }
      );
    }

    if (currentKycStatus === "APPROVED") {
      return NextResponse.json(
        { success: false, error: "Approved partner cannot be rejected" },
        { status: 400 }
      );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const adminUid = decoded.uid;

    // -----------------------------------
    // 4) Update Partner Document (REJECT)
    // -----------------------------------
    await partnerRef.update({
      kycStatus: "REJECTED",
      status: "REJECTED",
      approved: false,

      "kyc.status": "REJECTED",
      "kyc.rejectionReason": reason,

      kycRejectedAt: now,
      rejectedBy: adminUid,
      updatedAt: now,
    });

    // -----------------------------------
    // 5) Audit Log
    // -----------------------------------
    await adminDb.collection("partnerApprovals").add({
      partnerId,
      partnerUid,
      adminId: adminUid,
      action: "REJECT",
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
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
