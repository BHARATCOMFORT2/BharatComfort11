export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // 1) Extract Session Cookie
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split(";")
        .find((c) => c.trim().startsWith("__session="))
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // 2) Verify Session Cookie
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true).catch(() => null);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // 3) Fetch Partner Document
    const snap = await adminDb.collection("partners").doc(uid).get();

    if (!snap.exists) {
      return NextResponse.json({
        ok: true,
        exists: false,
        partner: null,
        kycStatus: "not_submitted",
        status: "not_created"
      });
    }

    const partner = snap.data();

    return NextResponse.json({
      ok: true,
      exists: true,
      uid,
      partner,
      kycStatus: partner.kycStatus || "not_submitted",
      status: partner.status || "pending",
      claims: {
        partner: decoded.partner || false,
        admin: decoded.admin || false,
      },
    });
  } catch (err: any) {
    console.error("Partner profile error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
