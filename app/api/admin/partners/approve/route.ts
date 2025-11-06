// app/api/admin/partners/approve/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import * as admin from "firebase-admin";

export async function POST(req: Request) {
  const { adminDb } = getFirebaseAdmin();

  try {
    const data = await req.json();

    if (!data.partnerId) {
      return NextResponse.json(
        { success: false, error: "partnerId is required" },
        { status: 400 }
      );
    }

    // ✅ Step 1: Approve partner
    await adminDb.collection("partners").doc(data.partnerId).update({
      approved: true,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ✅ Step 2: Check if this partner was referred by someone
    const referralSnap = await adminDb
      .collection("referrals")
      .where("referredUserId", "==", data.partnerId)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!referralSnap.empty) {
      const referralDoc = referralSnap.docs[0];
      const referral = referralDoc.data();
      const referrerId = referral.referrerId;

      // ✅ Step 3: Credit ₹500 to referrer’s wallet
      await adminDb.collection("users").doc(referrerId).set(
        {
          walletBalance: admin.firestore.FieldValue.increment(500),
          totalEarnings: admin.firestore.FieldValue.increment(500),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Record in wallet transactions
      await adminDb
        .collection("users")
        .doc(referrerId)
        .collection("wallet")
        .add({
          type: "credit",
          source: "referral_partner",
          amount: 500,
          referredUserId: data.partnerId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // ✅ Step 4: Mark referral as completed
      await referralDoc.ref.set(
        {
          status: "completed",
          rewardAmount: 500,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(
        `✅ Referral reward credited: ₹500 to referrer ${referrerId} for partner ${data.partnerId}`
      );
    }

    return NextResponse.json({
      success: true,
      message: "Partner approved successfully",
    });
  } catch (err: any) {
    console.error("Error approving partner:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
