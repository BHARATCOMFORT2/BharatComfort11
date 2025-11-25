// app/api/partners/kyc/route.ts
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/* -------------------------------------------------------
   READ AUTH COOKIE (Corrected)
------------------------------------------------------- */
function extractSessionCookie(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((c) => c.trim());

  return (
    cookies.find((c) => c.startsWith("__session="))?.split("=")[1] ||
    cookies.find((c) => c.startsWith("session="))?.split("=")[1] ||
    ""
  );
}

/* -------------------------------------------------------
   GET → return latest KYC status
------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    const sessionCookie = extractSessionCookie(req);
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "No authentication session" },
        { status: 401 }
      );
    }

    const decoded = await adminAuth
      .verifySessionCookie(sessionCookie, true)
      .catch(() => null);

    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const uid = decoded.uid;

    // Partner profile
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

    // Latest KYC Doc
    const kycSnap = await partnerRef
      .collection("kycDocs")
      .orderBy("submittedAt", "desc")
      .limit(1)
      .get();

    let kycStatus = (partner.kycStatus || "NOT_STARTED").toUpperCase();
    let latestKyc = null;

    if (!kycSnap.empty) {
      const d = kycSnap.docs[0];
      latestKyc = { id: d.id, ...d.data() };

      const raw = latestKyc.status || partner.kycStatus || "NOT_STARTED";

      // normalize status
      if (raw === "PENDING") kycStatus = "UNDER_REVIEW";
      else kycStatus = raw.toUpperCase();
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
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------
   POST → SUBMIT KYC
------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { token, idType, idNumberMasked, documents } = body;

    if (!token || !idType || !idNumberMasked || !documents) {
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

    // Clean docs
    const cleanedDocs = documents.map((d: any) => ({
      docType: d.docType,
      storagePath: d.storagePath,
      uploadedAt: new Date(),
    }));

    // Create new KYC submission
    const kycRef = partnerRef.collection("kycDocs").doc();
    await kycRef.set({
      idType,
      idNumberMasked,
      documents: cleanedDocs,
      status: "UNDER_REVIEW", // 🔥 corrected
      submittedAt: new Date(),
    });

    // update main partner profile
    await partnerRef.set(
      {
        kycStatus: "UNDER_REVIEW",
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      message: "KYC submitted successfully",
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
