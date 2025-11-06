import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseadmin";
import * as admin from "firebase-admin";

/**
 * 💳 Manual Wallet Adjustment API (Admin only)
 * Supports credit/debit adjustments with transaction log.
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

    const userRef = adminDb.collection("users").doc(uid);
    const walletRef = userRef.collection("wallet").doc();

    await adminDb.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      const data = userSnap.data() || {};
      let newBalance = data.walletBalance || 0;
      let newEarnings = data.totalEarnings || 0;

      if (type === "credit") {
        newBalance += amt;
        newEarnings += amt;
      } else if (type === "debit") {
        if (newBalance < amt) throw new Error("Insufficient wallet balance for debit");
        newBalance -= amt;
      }

      // 1️⃣ Update wallet and totals
      tx.set(
        userRef,
        {
          walletBalance: newBalance,
          totalEarnings: newEarnings,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // Optional: log to system logs
    await adminDb.collection("system_logs").add({
      type: "manual_wallet_adjustment",
      uid,
      amount: amt,
      adjustmentType: type,
      reason,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
