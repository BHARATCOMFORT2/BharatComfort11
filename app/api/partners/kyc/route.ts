// app/api/partners/kyc/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/* -------------------------------------------------------
   ✅ READ AUTH COOKIE (ALL SUPPORTED)
------------------------------------------------------- */
function extractSessionCookie(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((c) => c.trim());

  return (
    cookies.find((c) => c.startsWith("__session="))?.split("=")[1] ||
    cookies.find((c) => c.startsWith("session="))?.split("=")[1] ||
    cookies.find((c) => c.startsWith("firebase_session="))?.split("=")[1] ||
    ""
  );
}

/* -------------------------------------------------------
   ✅ GET → Return Latest KYC Status
------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    const sessionCookie = extractSessionCookie(req);
    if (!sessionCookie) {
      return NextResponse.json(
        { ok: false, error: "No authentication session" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decoded) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

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

    // Latest KYC doc
    const kycSnap = await partnerRef
      .collection("kycDocs")
      .orderBy("submittedAt", "desc")
      .limit(1)
      .get();

    let kycStatus = String(partner.kycStatus || "NOT_STARTED").toUpperCase();
    let latestKyc = null;

    if (!kycSnap.empty) {
      const d = kycSnap.docs[0];
      latestKyc = { id: d.id, ...d.data() };

      const raw = latestKyc.status || partner.kycStatus || "NOT_STARTED";

      if (raw === "PENDING") kycStatus = "UNDER_REVIEW";
      else kycStatus = String(raw).toUpperCase();
    }

    return NextResponse.json({
      ok: true,
      uid,
      kycStatus,
      latestKyc,
    });
  } catch (err: any) {
    console.error("🔥 KYC GET Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------
   ✅ POST → SUBMIT / RESUBMIT KYC
------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb, admin } = getFirebaseAdmin();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const {
      token,
      idType,
      idNumberMasked,
      documents = [],
      meta = {},
      isResubmission = false,
    } = body;

    if (!token || !idType || !idNumberMasked) {
      return NextResponse.json(
        { error: "Missing required fields" },
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
    const partnerSnap = await partnerRef.get();

    if (!partnerSnap.exists) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    // ✅ Clean documents safely
    const cleanedDocs = Array.isArray(documents)
      ? documents.map((d: any) => ({
          docType: d.docType || "UNKNOWN",
          storagePath: d.storagePath,
          uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        }))
      : [];

    // ✅ Create new KYC Submission (Audit Safe)
    const kycRef = partnerRef.collection("kycDocs").doc();

    await kycRef.set({
      idType,
      idNumberMasked,
      documents: cleanedDocs,
      meta: meta || {},
      status: "UNDER_REVIEW",
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      isResubmission: !!isResubmission,
    });

    // ✅ Update main partner profile
    await partnerRef.set(
      {
        kycStatus: "UNDER_REVIEW",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        kyc: {
          status: "UNDER_REVIEW",
          lastSubmittedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastKycId: kycRef.id,
        },
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      success: true,
      message: "✅ KYC submitted successfully",
      kycId: kycRef.id,
    });
  } catch (err: any) {
    console.error("🔥 KYC POST Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
