"use server";

import { db } from "@/lib/firebaseadmin";
import { revalidatePath } from "next/cache";

/** 💳 Approve payout & credit wallet (atomic transaction) */
export async function approvePayoutAction(formData: FormData) {
  const monthKey = String(formData.get("monthKey"));
  const uid = String(formData.get("uid"));
  const totalReward = Number(formData.get("totalReward"));
  const docId = String(formData.get("docId"));

  if (!monthKey || !uid || !docId || !Number.isFinite(totalReward) || totalReward <= 0) {
    throw new Error("Invalid payout data");
  }

  const monthDocRef = db
    .collection("referralStatsMonthly")
    .doc(monthKey)
    .collection("users")
    .doc(uid);

  const userRef = db.collection("users").doc(uid);

  await db.runTransaction(async (tx) => {
    const monthDoc = await tx.get(monthDocRef);
    if (!monthDoc.exists) throw new Error("Monthly stat not found");

    const cur = monthDoc.data() || {};
    if (cur.payoutStatus === "paid") {
      throw new Error("Already paid");
    }

    const userSnap = await tx.get(userRef);
    const udata = userSnap.data() || {};
    const newBalance = (udata.walletBalance || 0) + totalReward;

    tx.set(
      userRef,
      {
        walletBalance: newBalance,
        totalEarnings: (udata.totalEarnings || 0) + totalReward,
        updatedAt: new Date(),
      },
      { merge: true }
    );

    const walletRef = userRef.collection("wallet").doc();
    tx.set(walletRef, {
      id: walletRef.id,
      type: "credit",
      source: "monthly_creator_agent_reward",
      monthKey,
      amount: totalReward,
      createdAt: new Date(),
    });

    tx.set(
      monthDocRef,
      {
        payoutStatus: "paid",
        paidAt: new Date(),
      },
      { merge: true }
    );
  });

  await db.collection("system_logs").add({
    type: "settlement_paid",
    monthKey,
    uid,
    amount: totalReward,
    createdAt: new Date(),
  });

  revalidatePath("/admin/referrals/settlements");
}
