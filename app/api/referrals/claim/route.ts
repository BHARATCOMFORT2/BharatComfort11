export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { adminDb, admin } = getFirebaseAdmin();

    const body = await req.json();
    const { uid, userType } = body;

    if (!uid || !userType) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    /* --------------------------------------
       1️⃣ Check referral code from cookie
    -------------------------------------- */
    const cookieStore = cookies();
    const referralCode =
      cookieStore.get("bc_referral_code")?.value || body.referralCode;

    if (!referralCode) {
      return NextResponse.json(
        { message: "No referral code found" },
        { status: 200 }
      );
    }

    /* --------------------------------------
       2️⃣ Find referrer from referral_codes/{uid}
    -------------------------------------- */
    const codeSnap = await adminDb
      .collection("referral_codes")
      .where("code", "==", referralCode)
      .limit(1)
      .get();

    if (codeSnap.empty) {
      return NextResponse.json(
        { message: "Invalid referral code" },
        { status: 200 }
      );
    }

    const referrerDoc = codeSnap.docs[0];
    const referrerId = referrerDoc.id;

    if (referrerId === uid) {
      return NextResponse.json(
        { message: "Self referral ignored" },
        { status: 200 }
      );
    }

    /* --------------------------------------
       3️⃣ Create referral entry (pending)
    -------------------------------------- */
    const refEntry = adminDb.collection("refer_and_earn").doc();

    await refEntry.set({
      id: refEntry.id,
      referrerId,
      referredUserId: uid,
      referralCode,
      status: "pending",
      rewardStatus: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    /* --------------------------------------
       4️⃣ Update referred user info
    -------------------------------------- */
    await adminDb
      .collection("users")
      .doc(uid)
      .set(
        {
          referredBy: referrerId,
          referredByCode: referralCode,
          referralStatus: "pending",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    /* --------------------------------------
       5️⃣ Increment referrer stats
    -------------------------------------- */
    await adminDb
      .collection("users")
      .doc(referrerId)
      .set(
        {
          referralStats: {
            totalReferrals:
              admin.firestore.FieldValue.increment(1)
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return NextResponse.json({
      success: true,
      message: "Referral recorded",
      referralCode,
    });
  } catch (error: any) {
    console.error("🔥 Referral Claim Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
