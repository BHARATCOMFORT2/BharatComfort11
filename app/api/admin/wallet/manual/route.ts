import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseadmin";

/**
 * 💳 Manual Wallet Adjustment API (Admin only)
 */
export async function POST(req: Request) {
  try {
    const { uid, amount, type, reason } = await req.json();

    if (!uid || !amount || !type || !reason) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const userRef = db.collection("users").doc(uid);
    const walletRef = userRef.collection("wallet").doc();

    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      const data = userSnap.data() || {};
      let newBalance = data.walletBalance || 0;
      let newEarnings = data.totalEarnings || 0;

      if (type === "credit") {
        newBalance += amt;
        newEarnings += amt;
      } else if (type === "debit") {
        if (newBalance < amt)
          throw new Error("Insufficient wallet balance for debit");
        newBalance -= amt;
      }

      // 1️⃣ Update wallet and totals
      tx.set(
        userRef,
        {
          walletBalance: newBalance,
          totalEarnings: newEarnings,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      // 2️⃣ Add wallet transaction record
      tx.set(walletRef, {
        id: walletRef.id,
        type,
        source: "manual_admin_adjustment",
        reason,
        amount: amt,
        createdAt: new Date(),
      });
    });

    // Optional: log to system logs
    await db.collection("system_logs").add({
      type: "manual_wallet_adjustment",
      uid,
      amount: amt,
      adjustmentType: type,
      reason,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("🔥 Manual wallet adjustment failed:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
