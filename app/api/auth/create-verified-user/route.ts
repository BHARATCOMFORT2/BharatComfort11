// app/api/auth/create-verified-user/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseadmin";

/**
 * Creates a verified user record. If role === "partner", it creates:
 *  - partners/{uid}   <-- full partner profile, kycStatus = "NOT_STARTED"
 *  - users/{uid}      <-- light pointer record: role = "partner", partnerId = uid
 *
 * This prevents duplication of full partner profile inside users/ and ensures
 * the onboarding flow checks partners/{uid}.kycStatus to decide whether to show KYC form.
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();

    const {
      uid,
      name,
      email,
      phone,
      role = "user",
      referredBy = null,
    } = data ?? {};

    if (!uid || !email) {
      return NextResponse.json({ success: false, message: "Missing uid or email" }, { status: 400 });
    }

    // 1) Write a lightweight users/{uid} document (common fields)
    const userDoc = {
      uid,
      name: name || null,
      email,
      phone: phone || null,
      role,
      // keep a simple onboarding status on users; real KYC status lives under partners/{uid}
      status: role === "partner" ? "partner_onboarding" : "active",
      emailVerified: true,
      phoneVerified: true,
      verified: role === "partner" ? false : true,
      createdAt: new Date().toISOString(),
      referredBy: referredBy ?? null,
    };

    await adminDb.collection("users").doc(uid).set(userDoc, { merge: true });

    // 2) If partner, create the partners/{uid} document (with kycStatus)
    if (role === "partner") {
      const partnerDoc = {
        uid,
        name: name || null,
        email,
        phone: phone || null,
        createdAt: new Date().toISOString(),
        // KYC lifecycle:
        // - "NOT_STARTED" (no KYC data submitted)
        // - "PENDING_KYC" (KYC form shown / started)
        // - "UNDER_REVIEW" (submitted, waiting admin review)
        // - "APPROVED"
        // - "REJECTED"
        kycStatus: "NOT_STARTED",
        kyc: null, // store submitted KYC object here once user submits
      };

      await adminDb.collection("partners").doc(uid).set(partnerDoc, { merge: true });

      return NextResponse.json({
        success: true,
        message: "Partner user created (pending KYC).",
        partnerId: uid,
      });
    }

    // Non-partner (regular user) created
    return NextResponse.json({
      success: true,
      message: "User created successfully.",
    });
  } catch (err: any) {
    console.error("❌ Error creating verified user:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
