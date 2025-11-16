export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// app/api/partners/profile/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseadmin";

// Extract Authorization header
function getAuthHeader(req: Request) {
  const auth = (req as any).headers?.get
    ? (req as any).headers.get("authorization")
    : (req as any).headers?.authorization;
  return auth || "";
}

export async function GET(req: Request) {
  try {
    // 1) Get token
    const authHeader = getAuthHeader(req);
    if (!authHeader)
      return NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401 }
      );

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match)
      return NextResponse.json(
        { error: "Malformed Authorization header" },
        { status: 401 }
      );

    const token = match[1];

    // 2) Verify token
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token, true);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // 3) Fetch partner profile from Firestore
    const partnerRef = adminDb.collection("partners").doc(uid);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json({
        ok: false,
        exists: false,
        status: "not_created",
        message: "Partner profile does not exist.",
      });
    }

    const data = partnerSnap.data();

    // Return safe partner data
    return NextResponse.json({
      ok: true,
      exists: true,
      uid,
      status: data.status || "pending",
      profile: {
        displayName: data.displayName || null,
        businessName: data.businessName || null,
        businessType: data.businessType || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        kycStatus: data.status || "pending",
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      },
      claims: {
        partner: decoded.partner || false,
        admin: decoded.admin || false,
      },
    });
  } catch (err: any) {
    console.error("Partner profile error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
