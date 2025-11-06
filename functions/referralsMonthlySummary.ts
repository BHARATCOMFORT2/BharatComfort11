import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/* ============================================================
   ⏰ Scheduled Function: Monthly Referral Rewards Aggregation
   Runs at midnight on the 1st day of every month.
============================================================ */
export const processMonthlyReferralStats = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const monthKey = `${year}-${(month + 1).toString().padStart(2, "0")}`;

  console.log(`🏁 Starting monthly referral aggregation for: ${monthKey}`);

  // 1️⃣ Get all creators and agents
  const participantsSnap = await db
    .collection("users")
    .where("userType", "in", ["creator", "agent"])
    .get();

  for (const doc of participantsSnap.docs) {
    const user = doc.data();
    const uid = doc.id;

    // 2️⃣ Get all completed referrals by this user for the month
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    const referralsSnap = await db
      .collection("referrals")
      .where("referrerId", "==", uid)
      .where("status", "==", "completed")
      .where("updatedAt", ">=", startDate)
      .where("updatedAt", "<", endDate)
      .get();

    if (referralsSnap.empty) {
      continue; // skip if no referrals this month
    }

    // 3️⃣ Calculate total booking amount and reward
    let totalBookingAmount = 0;
    let totalPartners = 0;
    referralsSnap.forEach((r) => {
      const d = r.data();
      if (d.bookingAmount) totalBookingAmount += d.bookingAmount;
      if (d.referredUserType === "partner") totalPartners++;
    });

    const rewardPercent = 5; // can be fetched from referralConfig
    const totalReward = Math.round(totalBookingAmount * (rewardPercent / 100));

    // 4️⃣ Create monthly summary doc
    await db
      .collection("referralStatsMonthly")
      .doc(monthKey)
      .collection("users")
      .doc(uid)
      .set({
        uid,
        userType: user.userType,
        totalBookingAmount,
        totalPartners,
        rewardPercent,
        totalReward,
        payoutStatus: "pending",
        createdAt: new Date(),
      });

    // 5️⃣ Update user-level summary
    await db.collection("users").doc(uid).set(
      {
        monthlyStats: {
          lastMonthKey: monthKey,
          totalBookingAmount,
          totalReward,
        },
        updatedAt: new Date(),
      },
      { merge: true }
    );

    console.log(`✅ ${uid} → ₹${totalReward} reward generated`);
  }

  console.log("🎯 Monthly referral aggregation completed.");
};
