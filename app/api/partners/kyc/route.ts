// app/api/partners/kyc/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * GET = return KYC status + latest submission
 */
export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // ---------------------------------------------------
    // 1. Read Firebase session cookie (required)
    // ---------------------------------------------------
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
      return NextResponse.json(
        { error: "Invalid or expired auth session" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // ---------------------------------------------------
    // 2. Load partner profile
    // ---------------------------------------------------
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

    // ---------------------------------------------------
    // 3. Read latest KYC document
    // ---------------------------------------------------
    const kycSnap = await partnerRef
      .collection("kycDocs")
      .orderBy("submittedAt", "desc")
      .limit(1)
      .get();

    let kycStatus = "NOT_STARTED";
    let latestKyc = null;

    if (!kycSnap.empty) {
      const doc = kycSnap.docs[0];
      latestKyc = { id: doc.id, ...doc.data() };

      const raw = latestKyc.status || partner.kycStatus || "pending";
      kycStatus = raw.toUpperCase();
    }

    return NextResponse.json({
      ok: true,
      exists: true,
      uid,
      kycStatus,
      latestKyc,
    });
  } catch (err: any) {
    console.error("🔥 KYC Status Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST = submit KYC (same as /submit, but optional)
 * If you don’t want POST here, you can delete it.
 */
export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { token, idType, idNumberMasked, documents } = body;
    if (!token || !idType || !documents) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    const partnerRef = adminDb.collection("partners").doc(uid);
    const snap = await partnerRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const cleaned = documents.map((d: any) => ({
      docType: d.docType,
      storagePath: d.storagePath,
      uploadedAt: new Date(),
    }));

    const kycRef = partnerRef.collection("kycDocs").doc();
    await kycRef.set({
      idType,
      idNumberMasked,
      documents: cleaned,
      status: "PENDING",
      submittedAt: new Date(),
    });

    await partnerRef.set(
      {
        kycStatus: "PENDING",
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      kycId: kycRef.id,
      message: "KYC submitted successfully",
    });
  } catch (err: any) {
    console.error("🔥 KYC POST Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
