import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseadmin";
import * as admin from "firebase-admin";
import { cookies } from "next/headers";

/* ============================================================
   🧩 Referral Claim API
   Triggered when a new user/partner signs up
============================================================ */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { uid, userType } = body; // "user" | "partner" | "creator" | "agent"
    if (!uid || !userType) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // 1️⃣ Get referral code from cookie or request
    const cookieStore = cookies();
    const referralCode =
      cookieStore.get("bc_referral_code")?.value || body.referralCode;

    if (!referralCode) {
      return NextResponse.json({ message: "No referral code found" }, { status: 200 });
    }

    // 2️⃣ Find referrer by referralCode
    const refQuery = await adminDb
      .collection("users")
      .where("referralCode", "==", referralCode)
      .limit(1)
      .get();

    if (refQuery.empty) {
      console.warn("Invalid referral code:", referralCode);
      return NextResponse.json({ message: "Invalid referral code" }, { status: 200 });
    }

    const referrerDoc = refQuery.docs[0];
    const referrerId = referrerDoc.id;
    const referrerData = referrerDoc.data() || {};

    // 🚫 Prevent self-referral
    if (referrerId === uid) {
      return NextResponse.json({ message: "Self-referral ignored" }, { status: 200 });
    }

    // 3️⃣ Add referral entry in Firestore (pending)
    const referralRef = adminDb.collection("referrals").doc();
    await referralRef.set({
      id: referralRef.id,
      referrerId,
      referredUserId: uid,
      referrerType: referrerData.userType || "user",
      referredUserType: userType,
      referralCode,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 4️⃣ Update new user’s profile with referrer info
    await adminDb.collection("users").doc(uid).set(
      {
        referredBy: referrerId,
        referredByCode: referralCode,
        referralStatus: "pending",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 5️⃣ Update referrer stats (increment total referrals)
    const totalReferrals =
      (referrerData.referralStats?.totalReferrals || 0) + 1;

    await adminDb.collection("users").doc(referrerId).set(
      {
        referralStats: {
          totalReferrals,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: "Referral recorded successfully",
      referralCode,
    });
  } catch (error) {
    console.error("🔥 Error processing referral:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
