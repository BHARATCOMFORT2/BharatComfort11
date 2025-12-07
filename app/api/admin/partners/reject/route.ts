export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * ✅ ADMIN: REJECT PARTNER KYC (NEW SYSTEM ALIGNED)
 * Body:
 * {
 *   partnerUid: string,
 *   kycId: string,
 *   reason: string
 * }
 */
export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    /* -----------------------------------
       1️⃣ Verify Admin via SESSION COOKIE
    ----------------------------------- */
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

    const adminUid = decoded.uid;

    // ✅ Enforce admin from users collection
    const adminSnap = await adminDb.collection("users").doc(adminUid).get();
    if (!adminSnap.exists || adminSnap.data()?.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    /* -----------------------------------
       2️⃣ Parse Body
    ----------------------------------- */
    const body = await req.json().catch(() => ({}));
    const partnerUid = body?.partnerUid;
    const kycId = body?.kycId;
    const reason = body?.reason;

    if (!partnerUid || !kycId || !reason) {
      return NextResponse.json(
        { success: false, error: "partnerUid, kycId and reason are required" },
        { status: 400 }
      );
    }

    /* -----------------------------------
       3️⃣ Load Partner + KYC Doc
    ----------------------------------- */
    const partnerRef = adminDb.collection("partners").doc(partnerUid);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Partner not found" },
        { status: 404 }
      );
    }

    const kycRef = partnerRef.collection("kycDocs").doc(kycId);
    const kycSnap = await kycRef.get();

    if (!kycSnap.exists) {
      return NextResponse.json(
        { success: false, error: "KYC record not found" },
        { status: 404 }
      );
    }

    const partner = partnerSnap.data() || {};
    const currentStatus = String(partner.kycStatus || "").toUpperCase();

    // ✅ Strict rejection rules
    if (currentStatus === "REJECTED") {
      return NextResponse.json(
        { success: false, error: "Partner already rejected" },
        { status: 409 }
      );
    }

    if (currentStatus === "APPROVED") {
      return NextResponse.json(
        { success: false, error: "Approved partner cannot be rejected" },
        { status: 400 }
      );
    }

    const now = FieldValue.serverTimestamp();

    /* -----------------------------------
       4️⃣ Update KYC DOC (SOURCE OF TRUTH)
    ----------------------------------- */
    await kycRef.update({
      status: "REJECTED",
      reviewedAt: now,
      reviewedBy: adminUid,
      rejectedReason: reason,
    });

    /* -----------------------------------
       5️⃣ Update PARTNER ROOT DOC
    ----------------------------------- */
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

    /* -----------------------------------
       6️⃣ Audit Log
    ----------------------------------- */
    await adminDb.collection("partnerApprovals").add({
      partnerUid,
      kycId,
      adminUid,
      action: "REJECT",
      reason,
      createdAt: now,
    });

    /* -----------------------------------
       7️⃣ Partner Notification (Optional)
    ----------------------------------- */
    try {
      await adminDb.collection("notifications").add({
        userId: partnerUid,
        type: "kyc",
        title: "KYC Rejected",
        body: `Your KYC was rejected. Reason: ${reason}`,
        createdAt: now,
        read: false,
        meta: { kycId, status: "REJECTED" },
      });
    } catch (notifErr) {
      console.warn("Notification create failed:", notifErr);
    }

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
