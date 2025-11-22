// app/api/admin/partners/pending/route.ts
// ✔ Lists all pending KYC submissions
// ✔ Matches new KYC structure: partners/{uid}/kycDocs/{kycId}
// ✔ Returns partner details + docs
// ✔ Requires admin auth

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export async function GET(req: Request) {
  try {
    const { adminAuth, adminDb } = getFirebaseAdmin();

    // -------------------------------
    // 1) Extract & verify admin session
    // -------------------------------
    const cookieHeader = req.headers.get("cookie") || "";
    const sessionCookie =
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("__session="))
        ?.split("=")[1] || "";

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated" },
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

    if (!decoded.admin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // -------------------------------
    // 2) Find all partners with pending KYC
    // -------------------------------
    const partnersSnap = await adminDb
      .collection("partners")
      .where("kycStatus", "==", "pending")
      .get();

    const pendingList: any[] = [];

    for (const partnerDoc of partnersSnap.docs) {
      const partnerId = partnerDoc.id;
      const partnerData = partnerDoc.data();

      // get the latest pending KYC submission from kycDocs
      const kycSnap = await adminDb
        .collection("partners")
        .doc(partnerId)
        .collection("kycDocs")
        .where("status", "==", "pending")
        .orderBy("submittedAt", "desc")
        .limit(1)
        .get();

      if (kycSnap.empty) continue;

      const kycDoc = kycSnap.docs[0];

      pendingList.push({
        partnerId,
        partner: {
          name: partnerData.name || null,
          email: partnerData.email || null,
          phone: partnerData.phone || null,
          businessName: partnerData.businessName || null,
        },
        kycId: kycDoc.id,
        kyc: kycDoc.data(),
      });
    }

    return NextResponse.json({
      success: true,
      total: pendingList.length,
      pending: pendingList,
    });
  } catch (err: any) {
    console.error("🔥 Admin pending KYC error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
