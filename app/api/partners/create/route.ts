export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin } = getFirebaseAdmin();

    /* -----------------------------------
       1️⃣ Parse body
    ------------------------------------*/
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const {
      token,
      displayName,
      phone,
      email,
      businessName,
      metadata,
    } = body;

    const now = admin.firestore.FieldValue.serverTimestamp();

    /* -----------------------------------
       2️⃣ Resolve or Create Firebase Auth User
       ✅ TOKEN OPTIONAL (NEW PARTNER SAFE)
    ------------------------------------*/
    let uid: string;
    let userEmail: string | null = email ?? null;

    let decoded: any = null;
    if (token) {
      decoded = await adminAuth.verifyIdToken(token).catch(() => null);
    }

    if (decoded) {
      // Existing logged-in user
      uid = decoded.uid;
      userEmail = decoded.email || userEmail;
    } else {
      // 🔥 NEW PARTNER SIGNUP (NO LOGIN YET)
      if (!email || !phone) {
        return NextResponse.json(
          { success: false, error: "Email and phone are required" },
          { status: 400 }
        );
      }

      const userRecord = await adminAuth.createUser({
        email,
        phoneNumber: phone,
        displayName: displayName ?? undefined,
      });

      uid = userRecord.uid;
    }

    /* -----------------------------------
       3️⃣ SET CUSTOM CLAIMS (CRITICAL)
    ------------------------------------*/
    await adminAuth.setCustomUserClaims(uid, {
      role: "partner",
      partner: true,
    });

    /* -----------------------------------
       4️⃣ USERS/{uid} — ENSURE ROLE=partner
    ------------------------------------*/
    const userRef = adminDb.collection("users").doc(uid);
    const userSnap = await userRef.get();
    const existingUser = userSnap.exists ? userSnap.data() : null;

    const userPayload: any = {
      uid,
      email: userEmail,
      phone: phone ?? existingUser?.phone ?? null,
      name: displayName ?? existingUser?.name ?? null,
      role: "partner",
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

    /* -----------------------------------
       5️⃣ PARTNERS/{uid} — SAFE UPSERT
    ------------------------------------*/
    const partnerRef = adminDb.collection("partners").doc(uid);
    const partnerSnap = await partnerRef.get();
    const existingPartner = partnerSnap.exists
      ? partnerSnap.data()
      : null;

    const partnerPayload: any = {
      uid,

      // Profile
      displayName:
        displayName ?? existingPartner?.displayName ?? null,
      phone: phone ?? existingPartner?.phone ?? null,
      email: userEmail ?? existingPartner?.email ?? null,
      businessName:
        businessName ?? existingPartner?.businessName ?? null,
      metadata: metadata ?? existingPartner?.metadata ?? null,

      // Lifecycle (NEVER auto downgrade)
      status: existingPartner?.status || "PENDING_KYC",
      kycStatus: existingPartner?.kycStatus || "NOT_STARTED",
      approved: existingPartner?.approved || false,
      approvedAt: existingPartner?.approvedAt || null,

      updatedAt: now,
    };

    if (!existingPartner) {
      partnerPayload.createdAt = now;
    }

    await partnerRef.set(partnerPayload, { merge: true });

    /* -----------------------------------
       6️⃣ SUCCESS
    ------------------------------------*/
    return NextResponse.json({
      success: true,
      partnerId: uid,
      message: "✅ Partner registered successfully",
    });
  } catch (err: any) {
    console.error("❌ Partner create error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
