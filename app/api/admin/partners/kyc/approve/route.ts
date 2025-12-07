export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { FieldValue } from "firebase-admin/firestore";

// ✅ Safe header reader
function getAuthHeader(req: Request) {
  const anyReq = req as any;
  return anyReq?.headers?.get
    ? anyReq.headers.get("authorization")
    : anyReq?.headers?.authorization;
}

/**
 * ✅ ADMIN: APPROVE PARTNER KYC (TOKEN BASED)
 * Body:
 * {
 *   partnerUid: string,
 *   kycId: string,
 *   remarks?: string,
 *   rewardAmount?: number
 * }
 */
export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    /* -----------------------------------
       ✅ 1️⃣ Verify Admin via BEARER TOKEN
    ----------------------------------- */
    const authHeader = getAuthHeader(req);

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Missing Authorization token" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const decoded = await adminAuth.verifyIdToken(token, true);

    if (!decoded?.uid) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
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
       ✅ 2️⃣ Parse Body
    ----------------------------------- */
    const body = await req.json().catch(() => ({}));
    const partnerUid = body?.partnerUid;
    const kycId = body?.kycId;
    const remarks = body?.remarks || null;
    const rewardAmount =
      typeof body?.rewardAmount === "number" ? body.rewardAmount : 500;

    if (!partnerUid || !kycId) {
      return NextResponse.json(
        { success: false, error: "partnerUid and kycId are required" },
        { status: 400 }
      );
    }

    /* -----------------------------------
       ✅ 3️⃣ Load Partner + KYC Doc
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

    // ✅ Double-approval protection
    if (currentStatus === "APPROVED") {
      return NextResponse.json(
        { success: false, error: "Partner already approved" },
        { status: 409 }
      );
    }

    const now = FieldValue.serverTimestamp();

    /* -----------------------------------
       ✅ 4️⃣ Update KYC DOC
    ----------------------------------- */
    await kycRef.update({
      status: "APPROVED",
      reviewedAt: now,
      reviewedBy: adminUid,
      remarks: remarks || null,
    });

    /* -----------------------------------
       ✅ 5️⃣ Update PARTNER ROOT DOC
    ----------------------------------- */
    await partnerRef.update({
      kycStatus: "APPROVED",
      status: "ACTIVE",
      approved: true,
      approvedAt: now,
      approvedBy: adminUid,
      remarks,
      "kyc.status": "APPROVED",
      kycApprovedAt: now,
      updatedAt: now,
    });

    /* -----------------------------------
       ✅ 6️⃣ Set Firebase Custom Claim
    ----------------------------------- */
    const authUser = await adminAuth.getUser(partnerUid).catch(() => null);

    if (authUser) {
      await adminAuth.setCustomUserClaims(partnerUid, {
        ...(authUser.customClaims || {}),
        partner: true,
        partnerId: partnerUid,
      });
    }

    /* -----------------------------------
       ✅ 7️⃣ Audit Log
    ----------------------------------- */
    await adminDb.collection("partnerApprovals").add({
      partnerUid,
      kycId,
      adminUid,
      action: "APPROVE",
      remarks,
      rewardAmount,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      message: "✅ Partner KYC approved successfully",
    });
  } catch (err: any) {
    console.error("Admin Partner Approve Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
