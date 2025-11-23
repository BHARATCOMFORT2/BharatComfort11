// app/api/admin/partners/approve/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";

/**
 * Admin: approve a partner
 * - Expects admin session cookie (__session)
 * - Body: { partnerId: string, remarks?: string, rewardAmount?: number }
 */
export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin } = getFirebaseAdmin();

    // 1) Verify session cookie
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split(";")
        .find((c) => c.trim().startsWith("__session="))
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated (no session)" }, { status: 401 });
    }

    const decodedAdmin = await adminAuth.verifySessionCookie(sessionCookie, true).catch(() => null);
    if (!decodedAdmin) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    if (!decodedAdmin.admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // 2) Parse body
    const body = await req.json().catch(() => ({}));
    const partnerId = body.partnerId;
    const remarks = body.remarks ?? null;
    const rewardAmount = typeof body.rewardAmount === "number" ? body.rewardAmount : 500;

    if (!partnerId) {
      return NextResponse.json({ error: "partnerId is required" }, { status: 400 });
    }

    // 3) Partner record
    const partnerRef = adminDb.collection("partners").doc(partnerId);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const partner = partnerSnap.data() || {};
    const partnerUid = partner.uid;

    if (!partnerUid) {
      return NextResponse.json({ error: "Partner doc missing uid" }, { status: 400 });
    }

    // Prevent duplicate approvals
    if (partner.status === "approved" || partner.approved === true) {
      return NextResponse.json({ error: "Partner already approved" }, { status: 409 });
    }

    const adminUid = decodedAdmin.uid;
    const now = admin.firestore.FieldValue.serverTimestamp();

    // 4) Update partner doc correctly (KYC FIXED!)
    await partnerRef.update({
      status: "approved",
      approved: true,
      approvedAt: now,
      approvedBy: adminUid,
      remarks: remarks,
      kycStatus: "APPROVED",      // FIXED
      kycApprovedAt: now,         // FIXED
      updatedAt: now,
    });

    // 5) Set custom claims
    const existingUser = await adminAuth.getUser(partnerUid).catch(() => null);
    const existingClaims = existingUser?.customClaims || {};

    await adminAuth.setCustomUserClaims(partnerUid, {
      ...existingClaims,
      partner: true,
      partnerId,
    });

    // 6) Log approval
    await adminDb.collection("partnerApprovals").add({
      partnerId,
      partnerUid,
      adminId: adminUid,
      action: "approve",
      remarks: remarks || null,
      createdAt: now,
    });

    // 7) Referral reward — safe transaction
    const referralQ = await adminDb
      .collection("referrals")
      .where("referredUserId", "==", partnerUid)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!referralQ.empty) {
      const refDoc = referralQ.docs[0];
      const refData = refDoc.data();
      const referrerId = refData.referrerId;

      if (referrerId) {
        const referrerRef = adminDb.collection("users").doc(referrerId);

        await adminDb.runTransaction(async (tx) => {
          const rSnap = await tx.get(referrerRef);

          if (!rSnap.exists) {
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
              walletBalance: admin.firestore.FieldValue.increment(rewardAmount),
              totalEarnings: admin.firestore.FieldValue.increment(rewardAmount),
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
      message: "Partner approved successfully",
    });
  } catch (err: any) {
    console.error("Error approving partner:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
