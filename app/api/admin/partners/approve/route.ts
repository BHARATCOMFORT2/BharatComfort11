// app/api/admin/partners/approve/route.ts

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";

/**
 * ✅ Admin: Approve Partner (Production Safe)
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

    // ✅ STRICT ADMIN ROLE CHECK (Firestore)
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
    const remarks = body?.remarks || null;
    const rewardAmount =
      typeof body?.rewardAmount === "number" ? body.rewardAmount : 500;

    if (!partnerId) {
      return NextResponse.json(
        { error: "partnerId is required" },
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

    // ✅ BLOCK DOUBLE APPROVAL
    if (
      partner.status === "approved" ||
      partner.status === "ACTIVE" ||
      partner.approved === true ||
      partner.kycStatus === "APPROVED" ||
      partner.kyc?.status === "APPROVED"
    ) {
      return NextResponse.json(
        { error: "Partner already approved" },
        { status: 409 }
      );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const adminUid = decoded.uid;

    // -----------------------------------
    // 4) Update Partner Document
    // -----------------------------------
    await partnerRef.update({
      status: "ACTIVE",
      approved: true,
      approvedAt: now,
      approvedBy: adminUid,
      remarks,
      kycStatus: "APPROVED",
      "kyc.status": "APPROVED",
      kycApprovedAt: now,
      updatedAt: now,
    });

    // -----------------------------------
    // 5) Set Custom Claims (Partner Role)
    // -----------------------------------
    const existingUser = await adminAuth.getUser(partnerUid).catch(() => null);
    if (!existingUser) {
      return NextResponse.json(
        { error: "Auth user not found for partner" },
        { status: 404 }
      );
    }

    const existingClaims = existingUser.customClaims || {};
    const newClaims = {
      ...existingClaims,
      partner: true,
      partnerId,
    };

    await adminAuth.setCustomUserClaims(partnerUid, newClaims);

    // -----------------------------------
    // 6) Log approval event
    // -----------------------------------
    await adminDb.collection("partnerApprovals").add({
      partnerId,
      partnerUid,
      adminId: adminUid,
      action: "approve",
      remarks,
      rewardAmount,
      createdAt: now,
    });

    // -----------------------------------
    // 7) Referral Reward Processing (SAFE)
    // -----------------------------------
    const referralsQ = await adminDb
      .collection("referrals")
      .where("referredUserId", "==", partnerUid)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!referralsQ.empty) {
      const refDoc = referralsQ.docs[0];
      const ref = refDoc.data();
      const referrerId = ref.referrerId;

      if (referrerId) {
        const referrerRef = adminDb.collection("users").doc(referrerId);

        await adminDb.runTransaction(async (tx) => {
          const refSnap = await tx.get(referrerRef);

          if (!refSnap.exists) {
            tx.set(
              referrerRef,
              {
                walletBalance: rewardAmount,
                totalEarnings: rewardAmount,
                updatedAt: now,
              },
              { merge: true }
            );
          } else {
            tx.update(referrerRef, {
              walletBalance:
                admin.firestore.FieldValue.increment(rewardAmount),
              totalEarnings:
                admin.firestore.FieldValue.increment(rewardAmount),
              updatedAt: now,
            });
          }

          tx.set(referrerRef.collection("wallet").doc(), {
            type: "credit",
            source: "referral_partner",
            amount: rewardAmount,
            referredUserId: partnerUid,
            createdAt: now,
          });

          tx.update(refDoc.ref, {
            status: "completed",
            rewardAmount,
            updatedAt: now,
          });
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "✅ Partner approved successfully",
    });
  } catch (err: any) {
    console.error("Admin Partner Approve Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
