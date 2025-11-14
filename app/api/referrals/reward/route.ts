import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { adminDb, admin } = getFirebaseAdmin();

    const body = await req.json();
    const { referredUserId, bookingAmount, rewardType } = body;

    if (!referredUserId || !rewardType) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    /* --------------------------------------
       1️⃣ Find pending referral
    -------------------------------------- */
    const referralSnap = await adminDb
      .collection("refer_and_earn")
      .where("referredUserId", "==", referredUserId)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (referralSnap.empty) {
      return NextResponse.json(
        { message: "No pending referral found" },
        { status: 200 }
      );
    }

    const referralDoc = referralSnap.docs[0];
    const referralData = referralDoc.data();
    const referrerId = referralData.referrerId;
    const referredUserType = referralData.referredUserType;

    /* --------------------------------------
       2️⃣ Compute reward
    -------------------------------------- */
    let rewardAmount = 0;

    if (rewardType === "user_booking" && bookingAmount) {
      rewardAmount = Math.round(bookingAmount * 0.05);
    } else if (rewardType === "partner_approval") {
      rewardAmount = 500; // fixed reward
    }

    /* --------------------------------------
       3️⃣ Credit reward to referrer wallet
    -------------------------------------- */
    const referrerRef = adminDb.collection("users").doc(referrerId);
    const referrerSnap = await referrerRef.get();
    const referrerData = referrerSnap.data() || {};

    await referrerRef.set(
      {
        walletBalance:
          (referrerData.walletBalance || 0) + rewardAmount,

        totalEarnings:
          (referrerData.totalEarnings || 0) + rewardAmount,

        referralStats: {
          successfulReferrals:
            (referrerData.referralStats?.successfulReferrals || 0) + 1,
        },

        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    /* --------------------------------------
       4️⃣ Mark referral as completed
    -------------------------------------- */
    await referralDoc.ref.set(
      {
        status: "completed",
        rewardAmount,
        bookingAmount: bookingAmount || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    /* --------------------------------------
       5️⃣ Prevent duplicate rewards
    -------------------------------------- */
    await adminDb.collection("users").doc(referredUserId).set(
      {
        referralStatus: "completed",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    /* --------------------------------------
       6️⃣ Add wallet transaction entry
    -------------------------------------- */
    await adminDb
      .collection("users")
      .doc(referrerId)
      .collection("wallet")
      .add({
        type: "credit",
        source: "referral_reward",
        referredUserId,
        referredUserType,
        amount: rewardAmount,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return NextResponse.json({
      success: true,
      message: "Referral reward credited successfully",
      rewardAmount,
    });
  } catch (error: any) {
    console.error("🔥 Reward API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
