// app/api/partners/create/route.ts

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin } = getFirebaseAdmin();

    // -----------------------------------
    // 1️⃣ Parse body
    // -----------------------------------
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { token, displayName, phone, email, businessName, metadata } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing token" },
        { status: 401 }
      );
    }

    // -----------------------------------
    // 2️⃣ Verify Firebase ID Token
    // -----------------------------------
    const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;
    const userEmail = decoded.email || email || null;
    const now = admin.firestore.FieldValue.serverTimestamp();

    // -----------------------------------
    // 3️⃣ Ensure USERS/{uid} exists with role=partner ✅ CRITICAL FIX
    // -----------------------------------
    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const existingUser = userSnap.exists ? userSnap.data() : null;

    const userPayload: any = {
      uid,
      email: userEmail,
      phone: phone ?? existingUser?.phone ?? null,
      name: displayName ?? existingUser?.name ?? null,
      role: "partner", // ✅ ENFORCED
      partnerId: uid,
      status: "partner_onboarding",
      emailVerified: true,
      phoneVerified: true,
      verified: false,
      updatedAt: now,
    };

    if (!existingUser) {
      userPayload.createdAt = now;
    }

    await userRef.set(userPayload, { merge: true });

    // -----------------------------------
    // 4️⃣ Create / Update PARTNERS/{uid} safely ✅ NO KYC RESET
    // -----------------------------------
    const partnerRef = adminDb.collection("partners").doc(uid);
    const partnerSnap = await partnerRef.get();
    const existing = partnerSnap.exists ? partnerSnap.data() : null;

    const partnerPayload: any = {
      uid,

      // Profile fields
      displayName: displayName ?? existing?.displayName ?? null,
      phone: phone ?? existing?.phone ?? null,
      email: userEmail ?? existing?.email ?? null,
      businessName: businessName ?? existing?.businessName ?? null,
      metadata: metadata ?? existing?.metadata ?? null,

      // ✅ Partner lifecycle NEVER auto downgrade
      status: existing?.status || "PENDING_KYC", // PENDING_KYC → ACTIVE → BLOCKED
      kycStatus: existing?.kycStatus || "NOT_STARTED",
      approved: existing?.approved || false,
      approvedAt: existing?.approvedAt || null,

      updatedAt: now,
    };

    if (!existing) {
      partnerPayload.createdAt = now;
    }

    await partnerRef.set(partnerPayload, { merge: true });

    // -----------------------------------
    // 5️⃣ Final success
    // -----------------------------------
    return NextResponse.json({
      success: true,
      partnerId: uid,
      message: "✅ Partner profile created / updated safely",
    });
  } catch (err: any) {
    console.error("❌ Partner create error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
