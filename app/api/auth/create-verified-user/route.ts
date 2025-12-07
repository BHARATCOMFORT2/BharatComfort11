// app/api/auth/create-verified-user/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * ✅ Creates a verified user record.
 * If role === "partner", it creates:
 *  - users/{uid}     -> light pointer record
 *  - partners/{uid} -> full partner profile with kycStatus
 */
export async function POST(req: Request) {
  try {
    const { adminDb, admin } = getFirebaseAdmin();
    const data = await req.json();

    const {
      uid,
      name,
      email,
      phone,
      role = "user",
      referredBy = null,
      referralCode = null,
      kycStatus = null,
    } = data ?? {};

    if (!uid || !email) {
      return NextResponse.json(
        { success: false, message: "Missing uid or email" },
        { status: 400 }
      );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    /* ✅ 1️⃣ USERS/{uid} (LIGHT POINTER DOC) */
    const userDoc = {
      uid,
      name: name || null,
      email,
      phone: phone || null,
      role,
      status: role === "partner" ? "partner_onboarding" : "active",
      emailVerified: true,
      phoneVerified: true,
      verified: role === "partner" ? false : true,
      createdAt: now,
      updatedAt: now,
      referredBy: referredBy ?? null,
      referralCode: referralCode ?? null,
      partnerId: role === "partner" ? uid : null,
    };

    await adminDb
      .collection("users")
      .doc(uid)
      .set(userDoc, { merge: true });

    /* ✅ 2️⃣ PARTNERS/{uid} (ONLY IF PARTNER) */
    if (role === "partner") {
      const partnerRef = adminDb.collection("partners").doc(uid);
      const partnerSnap = await partnerRef.get();

      // ✅ Prevent duplicate overwrite
      if (!partnerSnap.exists) {
        const partnerDoc = {
          uid,
          name: name || null,
          email,
          phone: phone || null,
          createdAt: now,
          updatedAt: now,

          // ✅ Partner lifecycle
          status: "PENDING_KYC",   // PENDING_KYC → ACTIVE → BLOCKED
          kycStatus: kycStatus || "NOT_STARTED",

          kyc: null,
          approved: false,
          approvedAt: null,
        };

        await partnerRef.set(partnerDoc);
      }

      return NextResponse.json({
        success: true,
        message: "✅ Partner user created (pending KYC).",
        partnerId: uid,
      });
    }

    /* ✅ 3️⃣ NORMAL USER */
    return NextResponse.json({
      success: true,
      message: "✅ User created successfully.",
    });
  } catch (err: any) {
    console.error("❌ Error creating verified user:", err);

    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Internal server error.",
      },
      { status: 500 }
    );
  }
}
