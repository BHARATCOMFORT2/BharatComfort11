// app/api/auth/create-verified-user/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * ✅ Creates or updates VERIFIED USER ONLY
 * ❌ Does NOT create partner document
 * Partner creation MUST happen via /api/partners/create
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
    } = data ?? {};

    if (!uid || !email) {
      return NextResponse.json(
        { success: false, message: "Missing uid or email" },
        { status: 400 }
      );
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    /* ----------------------------------
       1️⃣ FETCH EXISTING USER (SAFE)
    -----------------------------------*/
    const userRef = adminDb.collection("users").doc(uid);
    const snap = await userRef.get();
    const existing = snap.exists ? snap.data() : null;

    /* ----------------------------------
       2️⃣ ROLE SAFETY (NO DOWNGRADE)
    -----------------------------------*/
    const finalRole =
      existing?.role === "partner" ? "partner" : role;

    /* ----------------------------------
       3️⃣ USERS/{uid} (MERGE SAFE)
    -----------------------------------*/
    const userPayload: any = {
      uid,
      email,
      updatedAt: now,
    };

    if (!existing) {
      userPayload.createdAt = now;
    }

    if (name && !existing?.name) userPayload.name = name;
    if (phone && !existing?.phone) userPayload.phone = phone;

    userPayload.role = finalRole;
    userPayload.partnerId =
      finalRole === "partner" ? uid : existing?.partnerId ?? null;

    userPayload.status =
      finalRole === "partner"
        ? existing?.status ?? "partner_onboarding"
        : existing?.status ?? "active";

    userPayload.referredBy =
      existing?.referredBy ?? referredBy ?? null;

    userPayload.referralCode =
      existing?.referralCode ?? referralCode ?? null;

    // ✅ Verification flags SHOULD already be true
    // from OTP system — do NOT force overwrite
    if (!existing) {
      userPayload.emailVerified = true;
      userPayload.phoneVerified = true;
      userPayload.verified = finalRole !== "partner";
    }

    await userRef.set(userPayload, { merge: true });

    /* ----------------------------------
       4️⃣ RESPONSE
    -----------------------------------*/
    return NextResponse.json({
      success: true,
      message:
        finalRole === "partner"
          ? "User verified. Partner onboarding in progress."
          : "User verified successfully.",
    });
  } catch (err: any) {
    console.error("❌ create-verified-user error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Internal server error.",
      },
      { status: 500 }
    );
  }
}
