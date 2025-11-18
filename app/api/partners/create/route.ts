// app/api/partners/create/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { adminAuth, db } = getFirebaseAdmin();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { token, displayName, phone, email, businessName, metadata } = body;

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    // Verify Firebase ID token
    const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const uid = decoded.uid;

    // Partner document under uid
    const partnerRef = db.collection("partners").doc(uid);
    const snap = await partnerRef.get();

    const data = snap.exists ? snap.data() : {};

    await partnerRef.set(
      {
        uid,
        displayName: displayName ?? data?.displayName ?? null,
        phone: phone ?? data?.phone ?? null,
        email: email ?? data?.email ?? null,
        businessName: businessName ?? data?.businessName ?? null,
        metadata: metadata ?? data?.metadata ?? null,

        status: data?.status || "pending",
        createdAt: data?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      partnerId: uid,
      message: "Partner profile created/updated",
    });
  } catch (err: any) {
    console.error("Partner create error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
