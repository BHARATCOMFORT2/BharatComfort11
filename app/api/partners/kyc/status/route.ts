// app/api/partners/kyc/status/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // ----------------------------------------------------------
    // 1️⃣ READ ANY VALID SESSION COOKIE (fixes all cookie issues)
    // ----------------------------------------------------------
    const cookieHeader = req.headers.get("cookie") || "";

    const sessionCookie =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find(
          (c) =>
            c.startsWith("__session=") ||
            c.startsWith("session=") ||
            c.startsWith("firebase_session=")
        )
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated (no session cookie)" },
        { status: 401 }
      );
    }

    // ----------------------------------------------------------
    // 2️⃣ VERIFY SESSION COOKIE
    // ----------------------------------------------------------
    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired session cookie" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // ----------------------------------------------------------
    // 3️⃣ LOAD PARTNER DOCUMENT (may not exist yet)
    // ----------------------------------------------------------
    const partnerRef = adminDb.collection("partners").doc(uid);
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json({
        ok: true,
        exists: false,
        kycStatus: "NOT_STARTED",
        latestKyc: null,
      });
    }

    const partner = partnerSnap.data() || {};

    // Base status from main profile
    let kycStatus = (partner.kycStatus || "NOT_STARTED").toString().toUpperCase();

    // ----------------------------------------------------------
    // 4️⃣ LOAD LATEST KYC DOCUMENT
    // ----------------------------------------------------------
    const kycSnap = await partnerRef
      .collection("kycDocs")
      .orderBy("submittedAt", "desc")
      .limit(1)
      .get();

    let latestKyc = null;

    if (!kycSnap.empty) {
      const doc = kycSnap.docs[0];
      latestKyc = { id: doc.id, ...doc.data() };

      // normalize full status
      const raw =
        latestKyc.status ||
        partner.kycStatus ||
        "NOT_STARTED";

      kycStatus = raw.toString().toUpperCase();
    }

    // ----------------------------------------------------------
    // 5️⃣ RETURN FINAL RESPONSE
    // ----------------------------------------------------------
    return NextResponse.json({
      ok: true,
      uid,
      kycStatus,
      latestKyc,
    });
  } catch (err: any) {
    console.error("🔥 KYC STATUS ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
