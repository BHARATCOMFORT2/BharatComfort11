// app/api/admin/partners/approve/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";

/**
 * Admin: approve a partner
 * - Expects admin session cookie (__session) to be present and valid
 * - Body: { partnerId: string, remarks?: string, rewardAmount?: number }
 */
export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin } = getFirebaseAdmin();

    // 1) Verify session cookie (preferred for web admin)
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

    // require admin claim
    if (!decodedAdmin.admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // 2) Parse input
    const body = await req.json().catch(() => ({}));
    const partnerId = body?.partnerId;
    const remarks = body?.remarks ?? null;
    const rewardAmount = typeof body?.rewardAmount === "number" ? body.rewardAmount : 500; // default ₹500

    if (!partnerId) {
      return NextResponse.json({ error: "partnerId is required" }, { status: 400 });
    }

    // 3) Load partner doc
    const partnerRef = adminDb.collection("partners").doc(partnerId);
    const partnerSnap = await partnerRef.get();
    if (!partnerSnap.exists) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }
    const partner = partnerSnap.data() || {};

    // Ensure partner has uid (auth user)
    const partnerUid = partner.uid;
    if (!partnerUid) {
      return NextResponse.json({ error: "Partner doc has no linked uid" }, { status: 400 });
    }

    // Prevent double approval
    if (partner.status === "approved" || partner.approved === true) {
      return NextResponse.json({ error: "Partner already approved" }, { status: 409 });
    }

    // 4) Approve partner (update doc + set custom claim)
    const adminUid = decodedAdmin.uid;
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Update partner doc
    await partnerRef.update({
      status: "approved",
      approved: true,
      approvedAt: now,
      approvedBy: adminUid,
      remarks: remarks,
      kycStatus: "verified",
      kycVerifiedAt: now,
      updatedAt: now,
    });

    // Set partner custom claim on the user's auth record
    // Use the actual Auth UID (partnerUid)
    const existingUser = await adminAuth.getUser(partnerUid).catch(() => null);
    const existingClaims = existingUser?.customClaims || {};
    const newClaims = { ...existingClaims, partner: true, partnerId };
    await adminAuth.setCustomUserClaims(partnerUid, newClaims);

    // 5) Log approval
    await adminDb.collection("partnerApprovals").add({
      partnerId,
      partnerUid,
      adminId: adminUid,
      action: "approve",
      remarks: remarks || null,
      createdAt: now,
    });

    // 6) Process referral reward if any (safe transaction)
    // We'll find a pending referral where referredUserId === partnerUid
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
        // Perform wallet updates in a transaction for consistency
        const referrerRef = adminDb.collection("users").doc(referrerId);

        await adminDb.runTransaction(async (tx) => {
          const rSnap = await tx.get(referrerRef);
          if (!rSnap.exists) {
            // create minimal user record
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

          // add wallet transaction record
          tx.set(referrerRef.collection("wallet").doc(), {
            type: "credit",
            source: "referral_partner",
            amount: rewardAmount,
            referredUserId: partnerUid,
            createdAt: now,
          });

          // mark referral completed
          tx.update(refDoc.ref, {
            status: "completed",
            rewardAmount: rewardAmount,
            updatedAt: now,
          });
        });
      }
    }

    // 7) Optionally notify partner (left as placeholder)
    // await sendPartnerApprovalNotification(partner.email || partner.phone, ...)

    return NextResponse.json({ success: true, message: "Partner approved successfully" });
  } catch (err: any) {
    console.error("Error approving partner:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
