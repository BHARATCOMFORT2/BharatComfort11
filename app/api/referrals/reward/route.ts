import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseadmin";

/* ============================================================
   🎁 Reward Trigger API
   Called after a booking is successfully completed OR
   a referred partner is approved.
============================================================ */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { referredUserId, bookingAmount, rewardType } = body;
    // rewardType = "user_booking" | "partner_approval"

    if (!referredUserId || !rewardType) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // 1️⃣ Find pending referral for this user
    const referralSnap = await db
      .collection("referrals")
      .where("referredUserId", "==", referredUserId)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (referralSnap.empty) {
      return NextResponse.json({ message: "No pending referral found" }, { status: 200 });
    }

    const referralDoc = referralSnap.docs[0];
    const referralData = referralDoc.data();
    const referrerId = referralData.referrerId;
    const referredUserType = referralData.referredUserType;

    // 2️⃣ Compute reward
    let rewardAmount = 0;
    if (rewardType === "user_booking" && bookingAmount) {
      // 5% of first booking
      rewardAmount = Math.round(bookingAmount * 0.05);
    } else if (rewardType === "partner_approval") {
      // ₹500 fixed reward for referring partner
      rewardAmount = 500;
    }

    // 3️⃣ Credit reward to referrer wallet
    const referrerRef = db.collection("users").doc(referrerId);
    const referrerSnap = await referrerRef.get();
    const referrerData = referrerSnap.data() || {};

    const oldBalance = referrerData.walletBalance || 0;
    const newBalance = oldBalance + rewardAmount;

    await referrerRef.set(
      {
        walletBalance: newBalance,
        totalEarnings: (referrerData.totalEarnings || 0) + rewardAmount,
        referralStats: {
          successfulReferrals:
            (referrerData.referralStats?.successfulReferrals || 0) + 1,
        },
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // 4️⃣ Mark referral as completed
    await referralDoc.ref.set(
      {
        status: "completed",
        rewardAmount,
        bookingAmount: bookingAmount || null,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    // 5️⃣ Update referred user (to prevent duplicate rewards)
    await db.collection("users").doc(referredUserId).set(
      {
        referralStatus: "completed",
      },
      { merge: true }
    );

    // 6️⃣ Optional: Add entry in wallet history
    await db
      .collection("users")
      .doc(referrerId)
      .collection("wallet")
      .add({
        type: "credit",
        source: "referral_reward",
        referredUserId,
        referredUserType,
        amount: rewardAmount,
        createdAt: new Date(),
      });

    return NextResponse.json({
      success: true,
      message: "Referral reward credited successfully",
      rewardAmount,
    });
  } catch (error) {
    console.error("🔥 Error processing reward:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
