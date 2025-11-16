export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// app/api/partners/kyc/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseadmin";

function getHeader(req: Request) {
  return (req as any).headers?.get
    ? req.headers.get("authorization")
    : (req as any).headers?.authorization;
}

export async function POST(req: Request) {
  try {
    const authHeader = getHeader(req);
    if (!authHeader)
      return NextResponse.json(
        { error: "Missing Authorization" },
        { status: 401 }
      );

    const token = authHeader.replace("Bearer ", "");
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const body = await req.json();
    const { idType, idNumberMasked, documents } = body;

    if (!idType || !documents || !Array.isArray(documents)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // create a new KYC document
    const kycRef = await adminDb
      .collection("partners")
      .doc(uid)
      .collection("kycDocs")
      .add({
        idType,
        idNumberMasked: idNumberMasked || null,
        documents,
        status: "submitted",
        submittedAt: new Date(),
      });

    // update partner main profile
    await adminDb.collection("partners").doc(uid).set(
      {
        kycStatus: "submitted",
        kycLastSubmittedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, kycId: kycRef.id });
  } catch (err: any) {
    console.error("KYC Submit Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
