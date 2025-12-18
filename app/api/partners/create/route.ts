export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.split("Bearer ")[1];
}

export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin } = getFirebaseAdmin();
    const now = admin.firestore.FieldValue.serverTimestamp();

    /* -------------------------------
       1️⃣ Parse body
    --------------------------------*/
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { displayName, phone, email, businessName, metadata } = body;

    /* -------------------------------
       2️⃣ AUTH RESOLUTION (FIXED)
    --------------------------------*/
    let uid: string;
    let userEmail: string | null = email ?? null;

    const headerToken = getBearerToken(req);
    let decoded: any = null;

    if (headerToken) {
      decoded = await adminAuth.verifyIdToken(headerToken).catch(() => null);
    }

    if (decoded) {
      uid = decoded.uid;
      userEmail = decoded.email || userEmail;
    } else {
      // 🚨 New partner WITHOUT login
      if (!email || !phone) {
        return NextResponse.json(
          { success: false, error: "Email & phone required" },
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

    /* -------------------------------
       3️⃣ CUSTOM CLAIMS
    --------------------------------*/
    await adminAuth.setCustomUserClaims(uid, {
      role: "partner",
      partner: true,
    });

    /* -------------------------------
       4️⃣ USERS/{uid} (SAFE MERGE)
    --------------------------------*/
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
      status: existingUser?.status ?? "partner_onboarding",
      updatedAt: now,
    };

    if (!existingUser) {
      userPayload.createdAt = now;
    }

    await userRef.set(userPayload, { merge: true });

    /* -------------------------------
       5️⃣ PARTNERS/{uid}
    --------------------------------*/
    const partnerRef = adminDb.collection("partners").doc(uid);
    const partnerSnap = await partnerRef.get();
    const existingPartner = partnerSnap.exists
      ? partnerSnap.data()
      : null;

    const partnerPayload: any = {
      uid,
      displayName:
        displayName ?? existingPartner?.displayName ?? null,
      phone: phone ?? existingPartner?.phone ?? null,
      email: userEmail ?? existingPartner?.email ?? null,
      businessName:
        businessName ?? existingPartner?.businessName ?? null,
      metadata: metadata ?? existingPartner?.metadata ?? null,

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

    /* -------------------------------
       6️⃣ SUCCESS
    --------------------------------*/
    return NextResponse.json({
      success: true,
      partnerId: uid,
      message: "Partner registered successfully",
    });
  } catch (err: any) {
    console.error("❌ Partner create error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
