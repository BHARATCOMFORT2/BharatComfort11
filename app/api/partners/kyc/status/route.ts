// app/api/partners/kyc/status/route.ts

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";

/**
 * ✅ GET /api/partners/kyc/status
 *
 * Auth: Session cookie (__session)
 *
 * Response:
 * {
 *   ok: true,
 *   success: true,
 *   uid: string,
 *   kycStatus: "NOT_STARTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED",
 *   kyc: object | null
 * }
 */

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // -----------------------------------
    // 1) Verify Session Cookie
    // -----------------------------------
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("__session="))
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json(
        { ok: false, success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decoded) {
      return NextResponse.json(
        { ok: false, success: false, error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // -----------------------------------
    // 2) Fetch Partner Doc
    // -----------------------------------
    const partnerRef = adminDb.collection("partners").doc(uid);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json({
        ok: true,
        success: true,
        uid,
        kycStatus: "NOT_STARTED",
        kyc: null,
        exists: false,
      });
    }

    const partner = partnerSnap.data() || {};

    // -----------------------------------
    // 3) Normalize KYC Status
    // -----------------------------------
    const rawStatus =
      (partner.kycStatus as string | undefined) ||
      (partner.kyc?.status as string | undefined) ||
      "NOT_STARTED";

    const normalize = (s?: string) =>
      (s || "NOT_STARTED").toUpperCase();

    const kycStatus = normalize(rawStatus);

    return NextResponse.json({
      ok: true,
      success: true,
      uid,
      kycStatus,
      kyc: partner.kyc || null,
      exists: true,
    });
  } catch (err: any) {
    console.error("Partner KYC Status Error:", err);

    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: err.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
