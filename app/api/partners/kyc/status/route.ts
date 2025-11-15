// app/api/partners/kyc/status/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

// Helper to get auth token
function getAuthHeader(req: Request) {
  const auth = (req as any).headers?.get
    ? (req as any).headers.get("authorization")
    : (req as any).headers?.authorization;

  return auth || "";
}

export async function GET(req: Request) {
  try {
    // 1) Extract & verify token
    const authHeader = getAuthHeader(req);
    if (!authHeader) {
      return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 });
    }

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Malformed Authorization header" }, { status: 401 });
    }

    const idToken = match[1];
    let decoded;

    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const uid = decoded.uid;

    // 2) Fetch partner document
    const partnerRef = adminDb.collection("partners").doc(uid);
    const snapshot = await partnerRef.get();

    if (!snapshot.exists) {
      return NextResponse.json({
        exists: false,
        status: "not_created",
        message: "Partner profile not created",
      });
    }

    const data = snapshot.data();

    // 3) Standardize KYC status values
    const status = data.status || "pending";

    return NextResponse.json({
      ok: true,
      uid,
      status,
      partner: {
        displayName: data.displayName || null,
        businessName: data.businessName || null,
        reason: data.rejectedReason || null,
        updatedAt: data.updatedAt || null,
        approvedAt: data.approvedAt || null,
      },
    });
  } catch (err: any) {
    console.error("KYC status error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
