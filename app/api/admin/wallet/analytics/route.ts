import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseadmin";

/**
 * 📊 Wallet Analytics API
 * Returns summarized monthly stats and top referrers
 */
export async function GET() {
  try {
    // === 1️⃣ Monthly Credits vs Debits ===
    const now = new Date();
    const months: { month: string; credits: number; debits: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `${d.getFullYear()}-${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
      months.push({ month: label, credits: 0, debits: 0 });
    }

    const usersSnap = await adminDb.collection("users").get();

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const walletSnap = await adminDb
        .collection("users")
        .doc(uid)
        .collection("wallet")
        .orderBy("createdAt", "desc")
        .get();

      for (const tx of walletSnap.docs) {
        const data = tx.data();
        if (!data.createdAt || !data.amount) continue;

        // Safe Firestore timestamp conversion
        const ts =
          data.createdAt.toDate?.() ||
          (data.createdAt._seconds
            ? new Date(data.createdAt._seconds * 1000)
            : new Date(data.createdAt));

        const key = `${ts.getFullYear()}-${(ts.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`;
        const idx = months.findIndex((m) => m.month === key);

        if (idx !== -1) {
          if (data.type === "credit") months[idx].credits += data.amount;
          else if (data.type === "debit") months[idx].debits += data.amount;
        }
      }
    }

    // === 2️⃣ Top Referrers ===
    const referralSnap = await adminDb
      .collection("referrals")
      .where("status", "==", "completed")
      .get();

    const refTotals: Record<string, number> = {};
    for (const doc of referralSnap.docs) {
      const r = doc.data();
      if (!r.referrerId || !r.rewardAmount) continue;
      refTotals[r.referrerId] = (refTotals[r.referrerId] || 0) + r.rewardAmount;
    }

    const sortedReferrers = Object.entries(refTotals)
      .map(([id, total]) => ({ id, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const topReferrers = [];
    for (const r of sortedReferrers) {
      const userDoc = await adminDb.collection("users").doc(r.id).get();
      topReferrers.push({
        name: userDoc.data()?.name || r.id,
        total: r.total,
      });
    }

    // === 3️⃣ Total Wallet Growth (aggregate trend) ===
    const growth: { date: string; balance: number }[] = [];
    let cumulative = 0;
    for (const month of months) {
      const net = month.credits - month.debits;
      cumulative += net;
      growth.push({ date: month.month, balance: cumulative });
    }

    return NextResponse.json({
      monthly: months,
      topReferrers,
      growth,
    });
  } catch (err: any) {
    console.error("🔥 Wallet analytics error:", err);
    return NextResponse.json(
      { error: "Failed to fetch analytics", details: err.message },
      { status: 500 }
    );
  }
}
