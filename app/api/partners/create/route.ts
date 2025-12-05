// app/api/partners/create/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { adminAuth, db } = getFirebaseAdmin();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }

    const { token, displayName, phone, email, businessName, metadata } = body;

    if (!token) {
      return NextResponse.json({ success: false, error: "Missing token" }, { status: 401 });
    }

    // ✅ Verify Firebase ID token
    const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // ✅ Always use canonical partners/{uid}
    const partnerRef = db.collection("partners").doc(uid);
    const snap = await partnerRef.get();
    const existing = snap.exists ? snap.data() : null;

    // ✅ DO NOT RESET KYC STATUS OR APPROVAL STATE
    const safePartnerDoc = {
      uid,

      // Profile fields
      displayName: displayName ?? existing?.displayName ?? null,
      phone: phone ?? existing?.phone ?? null,
      email: email ?? existing?.email ?? null,
      businessName: businessName ?? existing?.businessName ?? null,
      metadata: metadata ?? existing?.metadata ?? null,

      // ✅ Partner lifecycle (NEVER downgrade these automatically)
      status: existing?.status || "PENDING_KYC", // PENDING_KYC → ACTIVE → BLOCKED
      kycStatus: existing?.kycStatus || "NOT_STARTED",
      approved: existing?.approved || false,
      approvedAt: existing?.approvedAt || null,

      // Timestamps
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await partnerRef.set(safePartnerDoc, { merge: true });

    return NextResponse.json({
      success: true,
      partnerId: uid,
      message: "✅ Partner profile created/updated safely",
    });
  } catch (err: any) {
    console.error("❌ Partner create error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
