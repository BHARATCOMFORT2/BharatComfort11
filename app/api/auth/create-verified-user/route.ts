export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb, admin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const {
      uid,
      name,
      email,
      phone,
      role = "user",
      referredBy = null,     // Referrer UID (if any)
      referredByCode = null, // Referrer Code (if any)
    } = data;

    if (!uid || !email || !phone) {
      return NextResponse.json(
        { success: false, message: "Missing required fields." },
        { status: 400 }
      );
    }

    // ✔ Generate referral code for this new user
    const referralCode = uid.slice(0, 6).toUpperCase();

    // ------------------------------------------
    // 1️⃣ Create REFERRAL CODE DOCUMENT
    // ------------------------------------------
    await adminDb.collection("referral_codes").doc(uid).set({
      uid,
      referralCode,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ------------------------------------------
    // 2️⃣ Create USER DOCUMENT
    // ------------------------------------------
    await adminDb.collection("users").doc(uid).set(
      {
        uid,
        name,
        email,
        phone,
        role,
        status: role === "partner" ? "pending" : "active",
        emailVerified: true,
        phoneVerified: true,
        verified: true,

        // Store referral metadata correctly
        referredBy,
        referredByCode,
        referralCode, // <-- user’s own referral code

        walletBalance: 0,
        totalEarnings: 0,
        referralStats: {
          totalReferrals: 0,
          successfulReferrals: 0,
        },

        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`✅ Verified user stored: ${email}`);

    return NextResponse.json({
      success: true,
      message: "User created successfully.",
      referralCode,
    });
  } catch (err: any) {
    console.error("❌ Error creating verified user:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Internal server error." },
      { status: 500 }
    );
  }
}
