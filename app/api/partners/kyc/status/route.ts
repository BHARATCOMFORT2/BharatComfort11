// app/api/partners/kyc/status/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // ----------------------------------------------
    // 1. Read Firebase session cookie (correct name)
    // ----------------------------------------------
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("session="))
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const uid = decoded.uid;

    // ----------------------------------------------
    // 2. Load partner profile
    // ----------------------------------------------
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

    // ----------------------------------------------
    // 3. Load latest KYC doc
    // ----------------------------------------------
    const kycSnap = await partnerRef
      .collection("kycDocs")
      .orderBy("submittedAt", "desc")
      .limit(1)
      .get();

    let latestKyc = null;
    let kycStatus = partner.kycStatus || "NOT_STARTED";

    if (!kycSnap.empty) {
      const doc = kycSnap.docs[0];
      latestKyc = { id: doc.id, ...doc.data() };

      const raw = latestKyc.status || partner.kycStatus || "pending";
      kycStatus = raw.toUpperCase();
    }

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
