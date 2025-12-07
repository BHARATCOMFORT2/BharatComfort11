// app/api/admin/partners/kyc/route.ts

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * ✅ Admin KYC Review API
 *
 * Method: POST
 * Body:
 * {
 *   partnerUid: string;
 *   kycId: string;
 *   action: "approve" | "reject";
 *   reason?: string;
 * }
 *
 * Auth:
 *  - Firebase session cookie (__session)
 *  - users/{uid}.role must be "admin"
 */

function getSessionCookie(req: Request): string {
  const cookieHeader = req.headers.get("cookie") || "";
  return (
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("__session="))
      ?.split("=")[1] || ""
  );
}

export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin } = getFirebaseAdmin();

    // -----------------------------------
    // 1) Auth: Session cookie
    // -----------------------------------
    const sessionCookie = getSessionCookie(req);

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

    const adminUid = decoded.uid;

    // ✅ Enforce admin role from Firestore users/{uid}
    const adminSnap = await adminDb.collection("users").doc(adminUid).get();
    if (!adminSnap.exists || adminSnap.data()?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // -----------------------------------
    // 2) Parse body
    // -----------------------------------
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { partnerUid, kycId, action, reason = "" } = body;

    if (!partnerUid || !kycId || !action) {
      return NextResponse.json(
        { error: "partnerUid, kycId and action are required" },
        { status: 400 }
      );
    }

    // Normalize action to final status
    const act = String(action).toLowerCase();
    let newStatus: "APPROVED" | "REJECTED";

    if (act === "approve" || act === "approved") {
      newStatus = "APPROVED";
    } else if (act === "reject" || act === "rejected") {
      newStatus = "REJECTED";
    } else {
      return NextResponse.json(
        { error: "Invalid action (must be approve/reject)" },
        { status: 400 }
      );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    // -----------------------------------
    // 3) Load partner & KYC doc
    // -----------------------------------
    const partnerRef = adminDb.collection("partners").doc(partnerUid);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const partnerData = partnerSnap.data() || {};

    const kycRef = partnerRef.collection("kycDocs").doc(kycId);
    const kycSnap = await kycRef.get();

    if (!kycSnap.exists) {
      return NextResponse.json(
        { error: "KYC document not found" },
        { status: 404 }
      );
    }

    // -----------------------------------
    // 4) Update individual KYC doc
    // -----------------------------------
    const kycUpdate: any = {
      status: newStatus,
      reviewedAt: now,
      reviewedBy: adminUid,
    };

    if (newStatus === "REJECTED") {
      kycUpdate.rejectedReason = reason || "No reason provided";
    }

    await kycRef.update(kycUpdate);

    // -----------------------------------
    // 5) Update partner-level status + embedded kyc object
    // -----------------------------------
    const partnerUpdate: any = {
      kycStatus: newStatus,
      kycReviewedAt: now,
      updatedAt: now,
      // sync embedded kyc object (if present)
      "kyc.status": newStatus,
      "kyc.reviewedAt": now,
      "kyc.reviewedBy": adminUid,
    };

    if (newStatus === "APPROVED") {
      partnerUpdate.approved = true;
      partnerUpdate.approvedAt = partnerData.approvedAt || now;
      partnerUpdate.status = partnerData.status || "ACTIVE";
      partnerUpdate.kycRejectionReason = null;
    }

    if (newStatus === "REJECTED") {
      partnerUpdate.approved = false;
      // do NOT wipe approvedAt if it was previously approved historically
      partnerUpdate.kycRejectionReason = reason || "KYC rejected by admin";
      // ensure partner is not fully active until fresh approval
      partnerUpdate.status = "PENDING_KYC";
    }

    await partnerRef.set(partnerUpdate, { merge: true });

    // -----------------------------------
    // 6) Audit trail
    // -----------------------------------
    await partnerRef.collection("kycAudit").add({
      action: newStatus === "APPROVED" ? "approved" : "rejected",
      reason: reason || null,
      adminUid,
      kycId,
      newStatus,
      createdAt: now,
    });

    // -----------------------------------
    // 7) Notification (non-fatal if fails)
    // -----------------------------------
    try {
      await adminDb.collection("notifications").add({
        userId: partnerUid,
        type: "kyc",
        title: `KYC ${newStatus}`,
        body:
          newStatus === "APPROVED"
            ? "Your KYC has been approved by the admin."
            : `Your KYC was rejected. Reason: ${
                reason || "See details in your partner dashboard."
              }`,
        status: newStatus,
        createdAt: now,
        read: false,
        meta: {
          kycId,
          kycStatus: newStatus,
        },
      });
    } catch (notifErr) {
      console.warn("Admin KYC: notification create failed:", notifErr);
      // non-fatal
    }

    return NextResponse.json({
      ok: true,
      success: true,
      status: newStatus,
      partnerUid,
      kycId,
    });
  } catch (err: any) {
    console.error("Admin KYC review error:", err);
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: err?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
