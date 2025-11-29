// app/api/partners/profile/route.ts

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export const dynamic = "force-dynamic";

/**
 * ✅ GET /api/partners/profile
 *
 * - Uses Firebase session cookie (__session) for auth
 * - Returns merged user + partner data
 * - Normalizes kycStatus
 *
 * Response (on success):
 * {
 *   ok: true,
 *   success: true,
 *   uid: string,
 *   user: { ...userDoc, uid },
 *   partner: { ...partnerDoc, uid },
 *   kycStatus: "NOT_STARTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED",
 *   latestKyc: partner.kyc || null
 * }
 *
 * If partner doc missing:
 * {
 *   ok: false,
 *   success: false,
 *   uid,
 *   exists: false
 * }
 */

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // -----------------------------------
    // 1) Extract session cookie
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
    // 2) Fetch user + partner docs
    // -----------------------------------
    const userRef = adminDb.collection("users").doc(uid);
    const partnerRef = adminDb.collection("partners").doc(uid);

    const [userSnap, partnerSnap] = await Promise.all([
      userRef.get(),
      partnerRef.get(),
    ]);

    const userData = userSnap.exists ? { uid, ...(userSnap.data() || {}) } : null;
    const partnerDataRaw = partnerSnap.exists
      ? { uid, ...(partnerSnap.data() || {}) }
      : null;

    // -----------------------------------
    // 3) If no partner doc, return exists:false
    // -----------------------------------
    if (!partnerSnap.exists) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          uid,
          exists: false,
          user: userData,
          partner: null,
        },
        { status: 200 }
      );
    }

    // -----------------------------------
    // 4) Normalize kycStatus
    // -----------------------------------
    const partner = partnerDataRaw || {};
    const rawKycStatus =
      (partner.kycStatus as string | undefined) ||
      (partner.kyc?.status as string | undefined) ||
      undefined;

    const normalizeKyc = (raw?: string | null) =>
      (raw || "NOT_STARTED").toString().toUpperCase();

    const kycStatus = normalizeKyc(rawKycStatus);

    const latestKyc = partner.kyc || null;

    // -----------------------------------
    // 5) Build response
    // -----------------------------------
    return NextResponse.json(
      {
        ok: true,
        success: true,
        uid,
        user: userData,
        partner: {
          ...partner,
          uid,
          kycStatus,
        },
        kycStatus,
        latestKyc,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Partner Profile Error:", err);
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
